const { Sequelize } = require('sequelize');
const { DATABASE_URL } = require('./environment');

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Solves SSL connection issues with Supabase
    },
  },
  logging: false,
});

module.exports = sequelize;
