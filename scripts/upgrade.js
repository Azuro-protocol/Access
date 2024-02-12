const hre = require("hardhat");
const { timeout } = require("../utils/utils");

async function main() {
  const TIME_OUT = 30000;

  const ACCESS_ADDRESS = process.env.ACCESS_ADDRESS;

  const Access = await ethers.getContractFactory("Access");
  console.log("Access:", ACCESS_ADDRESS);

  console.log("Upgrading Access...");
  const access = await upgrades.upgradeProxy(ACCESS_ADDRESS, Access);
  await timeout(TIME_OUT);

  const accessImplAddress = await upgrades.erc1967.getImplementationAddress(access.address);
  console.log("New access implementation:", accessImplAddress);

  // Verification
  try {
    await hre.run("verify:verify", {
      address: accessImplAddress,
      constructorArguments: [],
    });
  } catch (err) {}
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
