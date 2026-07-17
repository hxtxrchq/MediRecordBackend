const sequelize = require('../config/database');
const User = require('./User');
const Document = require('./Document');
const Permission = require('./Permission');
const AccessLog = require('./AccessLog');

const db = {
  sequelize,
  User,
  Document,
  Permission,
  AccessLog,
};

module.exports = db;
