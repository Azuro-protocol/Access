require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");

const AMOY_PRIVATE_KEY = process.env.AMOY_PRIVATE_KEY || "";
const POLYGON_PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY || "";
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

if (POLYGON_PRIVATE_KEY != "") {
  exportNetworks["polygon"] = {
    url: "https://polygon-rpc.com",
    accounts: [`${POLYGON_PRIVATE_KEY}`],
    gasPrice: 70000000000,
  };
}

if (AMOY_PRIVATE_KEY != "") {
  exportNetworks["amoy"] = {
    url: "https://polygon-amoy.drpc.org",
    accounts: [`${AMOY_PRIVATE_KEY}`],
  };
}

if (GNOSIS_PRIVATE_KEY != "") {
  exportNetworks["gnosis"] = {
    url: "https://rpc.ankr.com/gnosis",
    accounts: [`${GNOSIS_PRIVATE_KEY}`],
  };
}

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.27",
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
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      polygon: POLYGONSCAN_API_KEY, 
      amoy: POLYGONSCAN_API_KEY,
      gnosis: GNOSISSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com/",
        },
      },
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/",
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
