const { JsonRpcProvider } = require('ethers');
const { SEPOLIA_RPC_URL, MOCK_BLOCKCHAIN } = require('./environment');

const provider = MOCK_BLOCKCHAIN 
  ? null 
  : new JsonRpcProvider(SEPOLIA_RPC_URL);

module.exports = provider;
