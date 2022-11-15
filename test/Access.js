const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { makeAddRole, makeBindRole, makeGrantRole } = require("../utils/utils");

describe("Access", function () {
  let owner, user1, user2, user3;
  let access, mockProtocol;

  before(async () => {
    // Contracts are deployed using the first signer/account by default
    [owner, user1, user2, user3] = await ethers.getSigners();

    const Access = await ethers.getContractFactory("Access");
    access = await Access.deploy("Access NFT token", "AccNFT");

    const MockProtocol = await ethers.getContractFactory("MockProtocol");
    mockProtocol = await MockProtocol.deploy(access.address);
  });

  it("check granted user accessed to function, not granted user has no access", async () => {
    /**
      User granted roles
      ------+--------+---------+---------solidity
            |  Role0 |  Role1  |  Role2
      ------+--------+---------+---------
      User1 |        |    V    |         
      User2 |    V   |         |         
      User3 |        |         |    V


      func1 binded roles
      ------+--------+---------+---------
            |  Role0 |  Role1  |  Granted
      ------+--------+---------+----------
      User1 |        |    V    |    Yes
      User2 |    V   |         |    Yes
      User3 |        |         |    No
     */

    // add roles
    let res = [];
    for (const i of Array(3).keys()) {
      res.push(await makeAddRole(access, owner, "Role" + (i + 1).toString()));
    }

    // bind roles to function
    let abi = ["function externalAccFunc1(uint256)"];
    let iface = new ethers.utils.Interface(abi);
    let selector = iface.getSighash("externalAccFunc1"); // '0x8ff3e7dd'
    let funcIdCalced = BigNumber.from(mockProtocol.address).shl(96).or(BigNumber.from(selector));

    // bind Role1, Role2 to function
    for (const i of Array(2).keys()) {
      let resBind = await makeBindRole(access, owner, mockProtocol.address, selector, res[i].roleId);
      expect(resBind.funcId).to.be.eq(funcIdCalced.toHexString());
    }

    // add rights
    let resGranted = [];
    resGranted.push(await makeGrantRole(access, owner, user1, res[1].roleId)); // role 1
    resGranted.push(await makeGrantRole(access, owner, user2, res[0].roleId)); // role 0
    resGranted.push(await makeGrantRole(access, owner, user3, res[2].roleId)); // role 2

    // user1 and user2 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);
    await mockProtocol.connect(user2).externalAccFunc1(1);

    // user3 not granted function and rejected
    await expect(mockProtocol.connect(user3).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
  });
});
