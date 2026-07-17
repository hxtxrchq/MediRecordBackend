const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccessLog = sequelize.define('AccessLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  permissionId: {
    type: DataTypes.STRING,
    allowNull: true, // Can be null if access is rejected due to no permission record
  },
  documentId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  requesterWallet: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('requesterWallet', value.toLowerCase());
    }
  },
  result: {
    type: DataTypes.BOOLEAN, // true = Granted, false = Denied
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING, // e.g. "VALID", "REVOKED", "EXPIRED", "NO_PERMISSION", "BLOCKCHAIN_ERROR"
    allowNull: false,
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

module.exports = AccessLog;
