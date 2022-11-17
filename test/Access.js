const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { makeAddRole, makeBindRole, makeGrantRole } = require("../utils/utils");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Access", function () {
  async function deployContracts() {
    let owner, user1, user2, user3;
    let access, mockProtocol;
    let funcIdCalced, selector;

    [owner, user1, user2, user3] = await ethers.getSigners();

    const Access = await ethers.getContractFactory("Access");
    access = await Access.deploy("Access NFT token", "AccNFT");

    const MockProtocol = await ethers.getContractFactory("MockProtocol");
    mockProtocol = await MockProtocol.deploy(access.address);

    // prepare selector
    let abi = ["function externalAccFunc1(uint256)"];
    let iface = new ethers.utils.Interface(abi);
    selector = iface.getSighash("externalAccFunc1"); // '0x8ff3e7dd'
    funcIdCalced = BigNumber.from(mockProtocol.address).shl(96).or(BigNumber.from(selector));

    return { owner, user1, user2, user3, selector, funcIdCalced, access, mockProtocol };
  }

  it("check granted user accessed to function, not granted user has no access", async () => {
    /**
      User granted roles
      ------+--------+---------+---------
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
    const { owner, user1, user2, user3, selector, funcIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add roles
    let res = [];
    for (const i of Array(3).keys()) {
      res.push(await makeAddRole(access, owner, "Role" + (i + 1).toString()));
    }

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

    // run internal access check for approved call, only for gas consumption comparison
    await mockProtocol.embeddedAccFunc1(1);
    // run internal access check for not approved call, only for gas consumption comparison
    await expect(mockProtocol.connect(user1).embeddedAccFunc1(1)).to.be.reverted;
  });
  it("granted user1, transfer grant to user2, check user2 accessed to function", async () => {
    /**
      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |    V   |            User1 |    V   |   Yes   |
      User2 |        |            User2 |        |   No    |

      User1 transfer Role0 -> User2

      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |        |            User1 |        |   No    |
      User2 |    V   |            User2 |    V   |   Yes   |
     */

    const { owner, user1, user2, _, selector, funcIdCalced, access, mockProtocol } = await loadFixture(deployContracts);

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // bind Role0
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selector, res.roleId);
    expect(resBind.funcId).to.be.eq(funcIdCalced.toHexString());

    // user1 add rights Role0
    let resGranted = await makeGrantRole(access, owner, user1, res.roleId);

    // user1 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);
    // user2 not granted function and rejected
    await expect(mockProtocol.connect(user2).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");

    // User1 transfer Role0 -> User2
    await access.connect(user1).transferFrom(user1.address, user2.address, resGranted.tokenId);

    // user1 not granted function and rejected
    await expect(mockProtocol.connect(user1).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
    // user2 has granted function
    await mockProtocol.connect(user2).externalAccFunc1(1);
  });
  it("granted user1, check user1 accessed to function, user1 burns grant", async () => {
    /**
      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |    V   |            User1 |    V   |   Yes   |

      User1 burns Role0

      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |        |            User1 |        |   No    |
     */

    const { owner, user1, user2, _, selector, funcIdCalced, access, mockProtocol } = await loadFixture(deployContracts);

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // bind Role0
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selector, res.roleId);
    expect(resBind.funcId).to.be.eq(funcIdCalced.toHexString());

    // user1 add rights Role0
    let resGranted = await makeGrantRole(access, owner, user1, res.roleId);

    // user1 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);

    // User1 burns acces token (Role0)
    await access.connect(user1).burn(resGranted.tokenId);

    // user1 not granted function and rejected
    await expect(mockProtocol.connect(user1).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
  });
});
