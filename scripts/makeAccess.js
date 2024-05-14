const hre = require("hardhat");
const { timeout, makeAddRole, makeBindRoles, makeGrantRole } = require("../utils/utils");

async function main() {
 try {
  const TIME_OUT = 20000;

  const ACCESS_ADDRESS = process.env.ACCESS_ADDRESS;
  if (!ACCESS_ADDRESS) {
    throw new Error("ACCESS_ADDRESS is not provided.");
    }
  
  const [deployer] = await ethers.getSigners();
  const SAFEWALLET = "0x0000000000000000000000000000000001010101";
  const PUBLWALLET = "0x0000000000000000000000000000000002020202";
  const MAINTAINER = "0x0000000000000000000000000000000003030303";

  const Access = await ethers.getContractFactory("Access", { signer: deployer });
  const access = await Access.attach(ACCESS_ADDRESS);

await Promise.all([
  makeAddRole(access, deployer, "Role for some sensitive action"), // 0
  timeout(TIME_OUT),
  makeAddRole(access, deployer, "Role for public action, is safe"), // 1
  timeout(TIME_OUT),
  makeAddRole(access, deployer, "Maintainer action role, settings"), // 2
  timeout(TIME_OUT),
]);


  const roleDatas = [
    { target: "0x0000000000000000000000000000000007654321", selector: "0xa8d9461a", roleId: 0 },
    { target: "0x0000000000000000000000000000000007654321", selector: "0xbcccebd6", roleId: 0 },
    { target: "0x0000000000000000000000000000000007654321", selector: "0xd58cf784", roleId: 0 },
    { target: "0x0000000000000000000000000000000007654321", selector: "0x2c2f32b0", roleId: 2 },
    { target: "0x0000000000000000000000000000000007654321", selector: "0x940b1428", roleId: 2 },
    { target: "0x0000000000000000000000000000000007654321", selector: "0x6a9e2777", roleId: 2 },
    { target: "0x0000000000000000000000000000000007654321", selector: "0x4cd35358", roleId: 1 },
  ];

  await makeBindRoles(access, deployer, roleDatas);
  await timeout(TIME_OUT);

await Promise.all([
  access.connect(deployer).grantRole(SAFEWALLET, 0),
  timeout(TIME_OUT),
  access.connect(deployer).grantRole(SAFEWALLET, 1),
  timeout(TIME_OUT),
  access.connect(deployer).grantRole(SAFEWALLET, 2),
  timeout(TIME_OUT),
  access.connect(deployer).grantRole(PUBLWALLET, 1),
  timeout(TIME_OUT),
  access.connect(deployer).grantRole(MAINTAINER, 1),
  timeout(TIME_OUT),
  access.connect(deployer).grantRole(MAINTAINER, 2),
]);

  } catch (error) {
  console.error(error);
  process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

