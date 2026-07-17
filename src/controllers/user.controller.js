const jwt = require('jsonwebtoken');
const { verifyMessage } = require('ethers');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/environment');
const { registryContract } = require('../contracts');
const { User } = require('../models');

// In-memory nonce store for challenge-response
const nonces = new Map();

const getChallenge = async (req, res, next) => {
  try {
    const { wallet } = req.query;
    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter is required' });
    }
    const lowercaseWallet = wallet.toLowerCase();
    const nonce = `MediRecord Challenge Nonce: ${Math.floor(Math.random() * 1000000)} at ${Date.now()}`;
    nonces.set(lowercaseWallet, nonce);
    
    // Clear nonce after 5 minutes
    setTimeout(() => {
      if (nonces.get(lowercaseWallet) === nonce) {
        nonces.delete(lowercaseWallet);
      }
    }, 5 * 60 * 1000);

    return res.json({ nonce });
  } catch (err) {
    next(err);
  }
};

const verifySignature = async (req, res, next) => {
  try {
    const { wallet, signature } = req.body;
    if (!wallet || !signature) {
      return res.status(400).json({ error: 'wallet and signature are required' });
    }
    
    const lowercaseWallet = wallet.toLowerCase();
    const nonce = nonces.get(lowercaseWallet);
    if (!nonce) {
      return res.status(400).json({ error: 'Challenge expired or not found. Call /auth/challenge first.' });
    }

    // Verify signature
    let recoveredAddress;
    try {
      recoveredAddress = verifyMessage(nonce, signature).toLowerCase();
    } catch (e) {
      return res.status(400).json({ error: 'Invalid signature format' });
    }

    if (recoveredAddress !== lowercaseWallet) {
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    // Clear nonce after successful verification
    nonces.delete(lowercaseWallet);

    // Fetch user details from blockchain to check registration and role
    const { MOCK_BLOCKCHAIN } = require('../config/environment');
    let roleName;
    if (MOCK_BLOCKCHAIN) {
      roleName = req.body.mockRole || 'PATIENT';
    } else {
      let onChainUser;
      try {
        onChainUser = await registryContract.getUser(wallet);
      } catch (contractErr) {
        console.error('Error reading from registry contract:', contractErr);
        onChainUser = { registrado: false, rol: 0 };
      }

      const rolEnum = ['NONE', 'ADMIN', 'PATIENT', 'DOCTOR', 'CLINIC', 'INSURANCE'];
      roleName = rolEnum[Number(onChainUser.rol)];

      // If wallet is not registered or has NONE role, auto-register as PATIENT
      if (!onChainUser.registrado || roleName === 'NONE') {
        console.log(`Wallet ${lowercaseWallet} not registered on-chain. Auto-registering as PATIENT.`);
        roleName = 'PATIENT';
      }
    }

    // Sync or insert user in DB
    let dbUser = await User.findByPk(lowercaseWallet);
    if (!dbUser) {
      dbUser = await User.create({
        wallet: lowercaseWallet,
        role: roleName,
        status: 'ACTIVE'
      });
    } else if (dbUser.role !== roleName) {
      dbUser.role = roleName;
      await dbUser.save();
    }

    // Issue JWT
    const token = jwt.sign({ wallet: lowercaseWallet, role: roleName }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.json({
      token,
      wallet: lowercaseWallet,
      role: roleName,
    });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.wallet);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    return res.json(user);
  } catch (err) {
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({ order: [['registeredAt', 'DESC']] });
    return res.json(users);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { displayName } = req.body;
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }
    const user = await User.findByPk(req.user.wallet);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    user.displayName = displayName.trim();
    await user.save();
    return res.json({ wallet: user.wallet, displayName: user.displayName, role: user.role });
  } catch (err) {
    next(err);
  }
};

// Admin can update the displayName of any user
const updateUserName = async (req, res, next) => {
  try {
    const { wallet } = req.params;
    const { displayName } = req.body;
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }
    const user = await User.findByPk(wallet.toLowerCase());
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    user.displayName = displayName.trim();
    await user.save();
    return res.json({ wallet: user.wallet, displayName: user.displayName, role: user.role });
  } catch (err) {
    next(err);
  }
};

// Anyone authenticated (e.g. patients) can search for doctors/clinics to share documents with
const getRecipients = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const recipients = await User.findAll({
      where: {
        role: {
          [Op.in]: ['DOCTOR', 'CLINIC', 'INSURANCE']
        },
        status: 'ACTIVE'
      },
      order: [['registeredAt', 'DESC']]
    });
    return res.json(recipients);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getChallenge,
  verifySignature,
  getProfile,
  getAllUsers,
  updateProfile,
  updateUserName,
  getRecipients,
};


