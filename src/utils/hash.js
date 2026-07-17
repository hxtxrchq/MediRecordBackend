const crypto = require('crypto');

function computeFileHash(fileBuffer) {
  // Returns a 32-byte hex string (with 0x prefix for solidity compatibility)
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return '0x' + hash;
}

function generateDocumentId() {
  // Generates a unique 32-byte bytes32 representation
  const uuid = crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(uuid + Date.now().toString()).digest('hex');
  return '0x' + hash;
}

module.exports = {
  computeFileHash,
  generateDocumentId,
};
