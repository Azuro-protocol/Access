const hre = require("hardhat");
const { timeout } = require("../utils/utils");

async function main() {
  const TIME_OUT = 800;

  const Access = await ethers.getContractFactory("Access");
  access = await upgrades.deployProxy(Access, ["Access NFT token", "AccNFT"]);
  await timeout(TIME_OUT);
  await access.deployed();
  await timeout(TIME_OUT);

  console.log("Access deployed to:", access.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
