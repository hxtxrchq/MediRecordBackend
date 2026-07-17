const { Permission, AccessLog, Document } = require('../models');

const syncPermission = async (req, res, next) => {
  try {
    const {
      permissionId,
      tokenId,
      documentId,
      authorizedWallet,
      expiresAt,
      txHash,
    } = req.body;

    if (!permissionId || !tokenId || !documentId || !authorizedWallet || !expiresAt) {
      return res.status(400).json({ error: 'Missing required permission sync fields' });
    }

    // Verify document belongs to caller
    const doc = await Document.findOne({ where: { documentId, status: 'ACTIVE' } });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in backend' });
    }

    if (doc.ownerWallet !== req.user.wallet) {
      return res.status(403).json({ error: 'Only the document owner can sync permissions' });
    }

    // Create or update permission record
    const [permission, created] = await Permission.findOrCreate({
      where: { permissionId },
      defaults: {
        tokenId,
        documentId,
        patientWallet: req.user.wallet,
        authorizedWallet: authorizedWallet.toLowerCase(),
        issuedAt: new Date(),
        expiresAt: new Date(Number(expiresAt) * 1000), // convert block timestamp (sec) to ms
        revoked: false,
        txHash: txHash || '',
      },
    });

    if (!created) {
      // Just update it if it already exists
      permission.tokenId = tokenId;
      permission.expiresAt = new Date(Number(expiresAt) * 1000);
      permission.txHash = txHash || permission.txHash;
      await permission.save();
    }

    return res.status(200).json({
      message: 'Permission synchronized successfully',
      permission,
    });
  } catch (err) {
    next(err);
  }
};

const syncRevocation = async (req, res, next) => {
  try {
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({ error: 'permissionId is required' });
    }

    const perm = await Permission.findOne({ where: { permissionId } });
    if (!perm) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    if (perm.patientWallet !== req.user.wallet) {
      return res.status(403).json({ error: 'Only the patient who issued the permission can sync revocation' });
    }

    perm.revoked = true;
    perm.revokedAt = new Date();
    await perm.save();

    return res.json({
      message: 'Permission revocation synchronized successfully',
      permission: perm,
    });
  } catch (err) {
    next(err);
  }
};

const getIssuedPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.findAll({
      where: { patientWallet: req.user.wallet },
      order: [['issuedAt', 'DESC']],
    });
    return res.json(permissions);
  } catch (err) {
    next(err);
  }
};

const getReceivedPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.findAll({
      where: { authorizedWallet: req.user.wallet, revoked: false },
      order: [['issuedAt', 'DESC']],
    });
    return res.json(permissions);
  } catch (err) {
    next(err);
  }
};

const getAccessLogs = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    // Check ownership of the document
    const doc = await Document.findOne({ where: { documentId } });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.ownerWallet !== req.user.wallet) {
      return res.status(403).json({ error: 'Only the document owner can inspect access logs' });
    }

    const logs = await AccessLog.findAll({
      where: { documentId },
      order: [['createdAt', 'DESC']],
    });

    return res.json(logs);
  } catch (err) {
    next(err);
  }
};

const getAllAccessLogs = async (req, res, next) => {
  try {
    const role = req.user.role;
    const wallet = req.user.wallet;

    let logs = [];
    if (role === 'ADMIN') {
      logs = await AccessLog.findAll({
        include: [{ model: Document, as: 'Document', attributes: ['fileName', 'category', 'ownerWallet'] }],
        order: [['createdAt', 'DESC']]
      });
    } else if (role === 'PATIENT') {
      logs = await AccessLog.findAll({
        include: [{ 
          model: Document, 
          as: 'Document', 
          where: { ownerWallet: wallet },
          attributes: ['fileName', 'category'] 
        }],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // DOCTOR, CLINIC, INSURANCE
      logs = await AccessLog.findAll({
        where: { requesterWallet: wallet },
        include: [{ model: Document, as: 'Document', attributes: ['fileName', 'category', 'ownerWallet'] }],
        order: [['createdAt', 'DESC']]
      });
    }

    return res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  syncPermission,
  syncRevocation,
  getIssuedPermissions,
  getReceivedPermissions,
  getAccessLogs,
  getAllAccessLogs,
};

