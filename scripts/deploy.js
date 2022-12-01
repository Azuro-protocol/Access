const hre = require("hardhat");
const { timeout } = require("../utils/utils");

async function main() {
  const TIME_OUT = 800;

  const Access = await hre.ethers.getContractFactory("Access");
  const access = await Access.deploy("Access NFT token", "AccNFT");
  await timeout(TIME_OUT);

  await access.deployed();

  console.log("Access deployed to:", access.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
