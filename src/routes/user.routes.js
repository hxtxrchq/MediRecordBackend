const express = require('express');
const { getChallenge, verifySignature, getProfile, getAllUsers, updateProfile, updateUserName, getRecipients } = require('../controllers/user.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/challenge', getChallenge);
router.post('/verify', verifySignature);
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);
router.get('/users', authenticateToken, requireAdmin, getAllUsers);
router.patch('/users/:wallet/name', authenticateToken, requireAdmin, updateUserName);
router.get('/recipients', authenticateToken, getRecipients);

module.exports = router;
