require('dotenv').config();

const isMock = process.env.MOCK_BLOCKCHAIN === 'true';
const requiredEnv = isMock ? ['JWT_SECRET', 'DATABASE_URL'] : ['SEPOLIA_RPC_URL', 'JWT_SECRET', 'DATABASE_URL'];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    console.error(`[Error] Missing required environment variable: ${env}`);
    process.exit(1);
  }
}

module.exports = {
  PORT: process.env.PORT || 3001,
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MOCK_BLOCKCHAIN: isMock,
  DATABASE_URL: process.env.DATABASE_URL,
};
