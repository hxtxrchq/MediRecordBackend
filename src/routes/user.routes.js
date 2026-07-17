const express = require('express');
const { getChallenge, verifySignature, getProfile } = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/challenge', getChallenge);
router.post('/verify', verifySignature);
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
