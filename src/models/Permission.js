const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  permissionId: {
    type: DataTypes.STRING, // bytes32 hex representation
    allowNull: false,
    unique: true,
  },
  tokenId: {
    type: DataTypes.INTEGER, // NFT Token ID
    allowNull: false,
  },
  documentId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  patientWallet: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('patientWallet', value.toLowerCase());
    }
  },
  authorizedWallet: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('authorizedWallet', value.toLowerCase());
    }
  },
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

module.exports = Permission;
