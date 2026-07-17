const { Contract } = require('ethers');
const provider = require('../config/provider');
const contractAddresses = require('./contract-addresses');
const registryABI = require('./MediRecordRegistryABI.json');
const nftABI = require('./MedicalAccessNFTABI.json');

const { MOCK_BLOCKCHAIN } = require('../config/environment');

const registryContract = MOCK_BLOCKCHAIN
  ? null
  : new Contract(
      contractAddresses.MediRecordRegistry,
      registryABI,
      provider
    );

const nftContract = MOCK_BLOCKCHAIN
  ? null
  : new Contract(
      contractAddresses.MedicalAccessNFT,
      nftABI,
      provider
    );

module.exports = {
  registryContract,
  nftContract,
};
