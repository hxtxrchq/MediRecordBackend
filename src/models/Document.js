const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  documentId: {
    type: DataTypes.STRING, // bytes32 hex representation
    allowNull: false,
    unique: true,
  },
  documentHash: {
    type: DataTypes.STRING, // bytes32 hex representation of SHA-256
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ownerWallet: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('ownerWallet', value.toLowerCase());
    }
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'ACTIVE',
    validate: {
      isIn: [['ACTIVE', 'DELETED']]
    }
  }
});

module.exports = Document;
