const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  wallet: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('wallet', value.toLowerCase());
    }
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['ADMIN', 'PATIENT', 'DOCTOR', 'CLINIC', 'INSURANCE']]
    }
  },
  registeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'ACTIVE',
    validate: {
      isIn: [['ACTIVE', 'INACTIVE']]
    }
  }
});

module.exports = User;
