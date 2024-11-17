const hre = require("hardhat");
const { timeout, makeAddRole, makeBindRoles, makeGrantRole } = require("../utils/utils");

async function main() {
  const TIME_OUT = 30000;

  const ACCESS_ADDRESS = process.env.ACCESS_ADDRESS;
  const [deployer] = await ethers.getSigners();
  const SAFEWALLET = "0x0000000000000000000000000000000001010101";
  const PUBLWALLET = "0x0000000000000000000000000000000002020202";
  const MAINTAINER = "0x0000000000000000000000000000000003030303";

  const Access = await ethers.getContractFactory("Access", { signer: deployer });
  const access = await Access.attach(ACCESS_ADDRESS);

  await makeAddRole(access, deployer, "Role for some sensitive action"); // 0
  await timeout(TIME_OUT);
  await makeAddRole(access, deployer, "Role for public action, is safe"); // 1
  await timeout(TIME_OUT);
  await makeAddRole(access, deployer, "Maintainer action role, settings"); // 2
  await timeout(TIME_OUT);

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

  await access.connect(deployer).grantRole(SAFEWALLET, 0);
  await timeout(TIME_OUT);
  await access.connect(deployer).grantRole(SAFEWALLET, 1);
  await timeout(TIME_OUT);
  await access.connect(deployer).grantRole(SAFEWALLET, 2);
  await timeout(TIME_OUT);
  await access.connect(deployer).grantRole(PUBLWALLET, 1);
  await timeout(TIME_OUT);
  await access.connect(deployer).grantRole(MAINTAINER, 1);
  await timeout(TIME_OUT);
  await access.connect(deployer).grantRole(MAINTAINER, 2);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
