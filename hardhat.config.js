require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");

require("dotenv").config();

const MUMBAI_PRIVATE_KEY = process.env.MUMBAI_PRIVATE_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";

const GNOSIS_PRIVATE_KEY = process.env.GNOSIS_PRIVATE_KEY || "";
const GNOSISSCAN_API_KEY = process.env.GNOSISSCAN_API_KEY || "";

const exportNetworks = {
  hardhat: {
    accounts: {
      accountsBalance: "1000000000000000000000000000000000",
    },
  },
};

if (MUMBAI_PRIVATE_KEY != "") {
  exportNetworks["mumbai"] = {
    //url: "https://polygon-testnet-rpc.allthatnode.com:8545",
    url: "https://rpc.ankr.com/polygon_mumbai",
    accounts: [`${MUMBAI_PRIVATE_KEY}`],
  };
  if (GNOSIS_PRIVATE_KEY != "") {
    exportNetworks["gnosis"] = {
      url: "https://rpc.ankr.com/gnosis",
      accounts: [`${GNOSIS_PRIVATE_KEY}`],
    };
  }
}

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: exportNetworks,
  etherscan: {
    apiKey: {
      mumbai: POLYGONSCAN_API_KEY,
      gnosis: GNOSISSCAN_API_KEY,
    },
    customChains: [
      {
        network: "mumbai",
        chainId: 80001,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/api",
          browserURL: "https://mumbai.polygonscan.com",
        },
      },
      {
        network: "gnosis",
        chainId: 100,
        urls: {
          apiURL: "https://api.gnosisscan.io/api",
          browserURL: "https://gnosisscan.io/",
        },
      },
    ],
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};
