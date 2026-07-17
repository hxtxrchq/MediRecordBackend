const path = require('path');
const fs = require('fs');
const { registryContract } = require('../contracts');
const { Document, AccessLog, Permission } = require('../models');
const { computeFileHash, generateDocumentId } = require('../utils/hash');
const { UPLOAD_DIR } = require('../config/environment');

const uploadDocument = async (req, res, next) => {
  try {
    // Only patient can upload
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients can upload medical documents' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const { category, description } = req.body;
    if (!category) {
      // Clean up uploaded file if validation fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Category is required' });
    }

    // Compute file hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const documentHash = computeFileHash(fileBuffer);
    const documentId = generateDocumentId();

    // Save technical metadata in DB
    const doc = await Document.create({
      documentId,
      documentHash,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      category,
      description: description || '',
      ownerWallet: req.user.wallet,
      status: 'ACTIVE',
    });

    return res.status(201).json({
      message: 'Document uploaded successfully. Register it on-chain next.',
      documentId,
      documentHash,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
    });
  } catch (err) {
    // Attempt clean up of file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    next(err);
  }
};

const getMyDocuments = async (req, res, next) => {
  try {
    const { wallet, role } = req.user;

    if (role === 'PATIENT') {
      // Patients view their owned documents
      const docs = await Document.findAll({
        where: { ownerWallet: wallet, status: 'ACTIVE' },
        order: [['uploadedAt', 'DESC']],
      });
      return res.json(docs);
    } else {
      // Medical actors (Doctor, Clinic, Insurance)
      // They see documents they have an active local permission record for
      const activePermissions = await Permission.findAll({
        where: {
          authorizedWallet: wallet,
          revoked: false,
        },
      });

      const docIds = activePermissions.map(p => p.documentId);
      
      const docs = await Document.findAll({
        where: {
          documentId: docIds,
          status: 'ACTIVE',
        },
        order: [['uploadedAt', 'DESC']],
      });

      return res.json(docs);
    }
  } catch (err) {
    next(err);
  }
};

const getDocumentDetails = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findOne({ where: { documentId, status: 'ACTIVE' } });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check authority to view details: either owner or has contract access
    const isOwner = doc.ownerWallet === req.user.wallet;
    let accessGranted = isOwner;

    if (!isOwner) {
      accessGranted = await registryContract.hasAccess(req.user.wallet, documentId);
    }

    if (!accessGranted) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(doc);
  } catch (err) {
    next(err);
  }
};

const downloadDocumentFile = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const requester = req.user.wallet;

    const doc = await Document.findOne({ where: { documentId, status: 'ACTIVE' } });
    if (!doc) {
      return res.status(404).json({ error: 'Document not registered in backend database' });
    }

    // Live validation against the smart contract
    const { MOCK_BLOCKCHAIN } = require('../config/environment');
    let hasAccess = false;
    let failReason = 'VALID';

    if (MOCK_BLOCKCHAIN) {
      const isOwner = doc.ownerWallet === requester;
      if (isOwner) {
        hasAccess = true;
      } else {
        const localPermission = await Permission.findOne({
          where: {
            documentId,
            authorizedWallet: requester,
            revoked: false,
          }
        });
        
        if (localPermission && new Date(localPermission.expiresAt) > new Date()) {
          hasAccess = true;
        } else if (localPermission) {
          failReason = 'EXPIRED';
        } else {
          failReason = 'NO_PERMISSION';
        }
      }
    } else {
      try {
        hasAccess = await registryContract.hasAccess(requester, documentId);
        if (!hasAccess) {
          failReason = 'NO_PERMISSION';
        }
      } catch (contractErr) {
        console.error('[Blockchain Query Error]:', contractErr);
        failReason = 'BLOCKCHAIN_ERROR';
      }
    }

    // Log the validation attempt
    let onChainPermissionId = null;
    if (!MOCK_BLOCKCHAIN) {
      onChainPermissionId = await registryContract.getPermissionByDocumentAndAuthorized(documentId, requester).catch(() => null);
    } else {
      const localPermission = await Permission.findOne({
        where: { documentId, authorizedWallet: requester }
      });
      onChainPermissionId = localPermission ? localPermission.permissionId : null;
    }
    
    await AccessLog.create({
      permissionId: onChainPermissionId || null,
      documentId,
      requesterWallet: requester,
      result: hasAccess,
      reason: failReason,
    });

    if (!hasAccess) {
      return res.status(403).json({ error: `Access Denied: ${failReason}` });
    }

    // Double check file exists on filesystem
    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ error: 'Physical PDF file not found on backend' });
    }

    // Send file
    return res.download(doc.filePath, doc.fileName);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadDocument,
  getMyDocuments,
  getDocumentDetails,
  downloadDocumentFile,
};
