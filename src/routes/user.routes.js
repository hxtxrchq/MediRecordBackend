const express = require('express');
const { getChallenge, verifySignature, getProfile, getAllUsers } = require('../controllers/user.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/challenge', getChallenge);
router.post('/verify', verifySignature);
router.get('/profile', authenticateToken, getProfile);
router.get('/users', authenticateToken, requireAdmin, getAllUsers);

module.exports = router;
