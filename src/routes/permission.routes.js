const express = require('express');
const {
  syncPermission,
  syncRevocation,
  getIssuedPermissions,
  getReceivedPermissions,
  getAccessLogs,
} = require('../controllers/permission.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/sync', authenticateToken, syncPermission);
router.post('/sync-revocation', authenticateToken, syncRevocation);
router.get('/issued', authenticateToken, getIssuedPermissions);
router.get('/received', authenticateToken, getReceivedPermissions);
router.get('/audit/:documentId', authenticateToken, getAccessLogs);

module.exports = router;
