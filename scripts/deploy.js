const hre = require("hardhat");
const { timeout } = require("../utils/utils");

async function main() {
  const TIME_OUT = 20000;

  const Access = await ethers.getContractFactory("Access");
  let access = await upgrades.deployProxy(Access, ["Access NFT token", "AccNFT"]);
  await timeout(TIME_OUT);
  await access.deployed();
  console.log("Access deployed to:", access.address);
  const accessImplAddress = await upgrades.erc1967.getImplementationAddress(access.address);
  console.log("Access implementation deployed to:", accessImplAddress);

  // Verification
  try {
    await hre.run("verify:verify", {
      address: accessImplAddress,
      constructorArguments: ["Access NFT token", "AccNFT"],
    });
  } catch (err) {}
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
