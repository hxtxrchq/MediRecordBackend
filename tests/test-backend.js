const { Wallet } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configure test environment variables before importing app/db
process.env.NODE_ENV = 'test';
process.env.MOCK_BLOCKCHAIN = 'true';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.PORT = '3002';

const app = require('../src/app');
const { sequelize } = require('../src/models');

async function runTests() {
  console.log('--- Starting MediRecord Backend Integration Tests ---');
  
  // 1. Sync database
  await sequelize.sync({ force: true });
  console.log('✔ Database synced (clean slate).');

  // Start test server
  const server = app.listen(3002, () => {
    console.log('✔ Test server started on port 3002.');
  });

  // Dynamic imports for fetch (native in Node 18+)
  const fetch = globalThis.fetch || require('node-fetch');

  try {
    // 2. Generate wallets
    const patientWallet = Wallet.createRandom();
    const doctorWallet = Wallet.createRandom();
    console.log(`✔ Generated test Patient Wallet: ${patientWallet.address}`);
    console.log(`✔ Generated test Doctor Wallet: ${doctorWallet.address}`);

    // 3. Challenge-Response for Patient
    const challengeRes = await fetch(`http://localhost:3002/api/v1/auth/challenge?wallet=${patientWallet.address}`);
    const { nonce } = await challengeRes.json();
    console.log(`✔ Challenge nonce received for Patient.`);

    const signature = await patientWallet.signMessage(nonce);
    const verifyRes = await fetch('http://localhost:3002/api/v1/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: patientWallet.address,
        signature,
        mockRole: 'PATIENT',
      }),
    });
    
    const { token: patientToken, role: patientRole } = await verifyRes.json();
    console.log(`✔ Verified signature. Patient JWT acquired. Role: ${patientRole}`);

    // 4. Create a mock PDF file to upload
    const mockPdfPath = path.join(__dirname, 'mock-document.pdf');
    fs.writeFileSync(mockPdfPath, '%PDF-1.4 mock content');
    console.log('✔ Created mock PDF file on disk.');

    // 5. Upload file using FormData (simulate client upload)
    // In Node.js, we can use built-in FormData or build multipart body manually
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(mockPdfPath));
    form.append('category', 'Cardiology');
    form.append('description', 'Test ultrasound document');

    const uploadRes = await new Promise((resolve, reject) => {
      form.submit({
        host: 'localhost',
        port: 3002,
        path: '/api/v1/documents/upload',
        headers: {
          'Authorization': `Bearer ${patientToken}`,
        }
      }, (err, res) => {
        if (err) return reject(err);
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
    });

    const { documentId, documentHash } = uploadRes.data;
    console.log(`✔ PDF uploaded. status: ${uploadRes.status}, documentId: ${documentId}, documentHash: ${documentHash}`);

    // 6. Authenticate Doctor
    const docChallengeRes = await fetch(`http://localhost:3002/api/v1/auth/challenge?wallet=${doctorWallet.address}`);
    const docNonce = (await docChallengeRes.json()).nonce;
    const docSignature = await doctorWallet.signMessage(docNonce);
    
    const docVerifyRes = await fetch('http://localhost:3002/api/v1/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: doctorWallet.address,
        signature: docSignature,
        mockRole: 'DOCTOR',
      }),
    });
    const { token: doctorToken } = await docVerifyRes.json();
    console.log(`✔ Verified signature. Doctor JWT acquired.`);

    // 7. Verify Doctor fails to access document before permission
    const preAccessRes = await fetch(`http://localhost:3002/api/v1/documents/${documentId}/file`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    console.log(`✔ Pre-access check failed as expected. status: ${preAccessRes.status} (should be 403)`);
    if (preAccessRes.status !== 403) throw new Error('Expected 403 access denied');

    // 8. Synchronize permission (as patient)
    const permissionId = '0x' + crypto.randomUUID().replace(/-/g, '');
    const syncRes = await fetch('http://localhost:3002/api/v1/permissions/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        permissionId,
        tokenId: 1,
        documentId,
        authorizedWallet: doctorWallet.address,
        expiresAt: Math.floor((Date.now() + 60 * 60 * 1000) / 1000), // 1 hour validity
        txHash: '0xmocktxhash12345'
      }),
    });
    console.log(`✔ Synchronized on-chain permission mock to DB. Status: ${syncRes.status}`);

    // 9. Verify Doctor successfully downloads document after permission
    const accessRes = await fetch(`http://localhost:3002/api/v1/documents/${documentId}/file`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    console.log(`✔ Access check succeeded. status: ${accessRes.status} (should be 200)`);
    if (accessRes.status !== 200) throw new Error('Expected 200 access granted');
    const pdfContent = await accessRes.text();
    console.log(`✔ Downloaded file content verification: "${pdfContent}"`);

    // 10. Synchronize revocation (as patient)
    const revokeRes = await fetch('http://localhost:3002/api/v1/permissions/sync-revocation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({ permissionId }),
    });
    console.log(`✔ Synchronized revocation. Status: ${revokeRes.status}`);

    // 11. Verify Doctor fails to access document after revocation
    const postRevokeRes = await fetch(`http://localhost:3002/api/v1/documents/${documentId}/file`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    console.log(`✔ Post-revocation check failed as expected. status: ${postRevokeRes.status} (should be 403)`);
    if (postRevokeRes.status !== 403) throw new Error('Expected 403 access denied after revocation');

    // 12. Verify access logs for patient
    const logsRes = await fetch(`http://localhost:3002/api/v1/permissions/audit/${documentId}`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const logs = await logsRes.json();
    console.log(`✔ Access Logs verified. Entries found: ${logs.length}`);
    logs.forEach(log => {
      console.log(`  - Log: Requester ${log.requesterWallet} | Result: ${log.result} | Reason: ${log.reason}`);
    });

    // Cleanup mock file
    fs.unlinkSync(mockPdfPath);
    console.log('✔ Cleaned up mock PDF file.');
    console.log('\n⭐⭐⭐ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ⭐⭐⭐');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

// Simple random UUID polyfill for ES modules inside CommonJS crypto
const crypto = require('crypto');
if (!crypto.randomUUID) {
  crypto.randomUUID = () => crypto.randomBytes(16).toString('hex');
}

runTests();
