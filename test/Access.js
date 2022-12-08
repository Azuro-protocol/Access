const { expect } = require("chai");
const { BigNumber } = require("ethers");
const {
  makeAddRole,
  makeBindRole,
  makeBindRoles,
  makeUnbindRole,
  makeGrantRole,
  makeRenameRole,
} = require("../utils/utils");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Access", function () {
  async function deployContracts() {
    let owner, user1, user2, user3;
    let access, mockProtocol;
    let funcsIdCalced = [];
    let selectors = [];

    [owner, user1, user2, user3] = await ethers.getSigners();

    const Access = await ethers.getContractFactory("Access");
    access = await upgrades.deployProxy(Access, ["Access NFT token", "AccNFT"]);
    await access.deployed();

    // try initialize again
    await expect(access.initialize("Access NFT token", "AccNFT")).to.be.revertedWith(
      "Initializable: contract is already initialized"
    );

    const MockProtocol = await ethers.getContractFactory("MockProtocol");
    mockProtocol = await MockProtocol.deploy(access.address);

    // prepare selector

    for (const i of Array(3).keys()) {
      let abi = ["function externalAccFunc" + (i + 1).toString() + "(uint256)"];
      let iface = new ethers.utils.Interface(abi);
      selectors.push(iface.getSighash("externalAccFunc" + (i + 1).toString()));
      funcsIdCalced.push(BigNumber.from(mockProtocol.address).shl(96).or(BigNumber.from(selectors[i])));
    }

    return { owner, user1, user2, user3, selectors, funcsIdCalced, access, mockProtocol };
  }

  it("try call owners funciton, from not owner", async () => {
    const { owner, user1, user2, _, selectors, funcIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // try add roles
    await expect(makeAddRole(access, user1, "Role0")).to.be.revertedWith("Ownable: caller is not the owner");

    // try bind role
    let res = await makeAddRole(access, owner, "Role0");
    await expect(makeBindRole(access, user1, mockProtocol.address, selectors[0], res.roleId)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    // try grant role from not owner
    await makeBindRole(access, owner, mockProtocol.address, selectors[0], res.roleId);
    await expect(makeGrantRole(access, user1, user1, res.roleId)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    // try rename role from not owner
    await expect(makeRenameRole(access, user1, res.roleId, "NewRole")).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    // try unbind role from not owner
    await expect(makeUnbindRole(access, user1, mockProtocol.address, selectors[0], res.roleId)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    // try to whitelist
    await expect(access.connect(user1).addWhitelist([user1.address, user2.address])).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    // try to remove from whitelist
    await expect(access.connect(user1).removeWhitelist([user1.address, user2.address])).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

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
    const { owner, user1, user2, user3, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add roles
    let res = [];
    for (const i of Array(3).keys()) {
      res.push(await makeAddRole(access, owner, "Role" + (i + 1).toString()));
    }

    // bind Role1, Role2 to function
    for (const i of Array(2).keys()) {
      let resBind = await makeBindRole(access, owner, mockProtocol.address, selectors[0], res[i].roleId);
      expect(resBind.funcId).to.be.eq(funcsIdCalced[0].toHexString());
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

    const { owner, user1, user2, _, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // bind Role0
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selectors[0], res.roleId);
    expect(resBind.funcId).to.be.eq(funcsIdCalced[0].toHexString());
    expect(await access.getFunctionId(mockProtocol.address, selectors[0])).to.be.eq(funcsIdCalced[0].toHexString());

    // user1 add rights Role0
    let resGranted = await makeGrantRole(access, owner, user1, res.roleId);

    // user1 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);
    // user2 not granted function and rejected
    await expect(mockProtocol.connect(user2).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");

    // User1 not whitelisted and try transfer Role0 -> User2
    await expect(
      access.connect(user1).transferFrom(user1.address, user2.address, resGranted.tokenId)
    ).to.be.rejectedWith("NotInWhitelist()");

    // add User1 to whitelist and try transfer Role0 -> User2, rejected User2 not whitelisted
    await access.addWhitelist([user1.address]);
    await expect(
      access.connect(user1).transferFrom(user1.address, user2.address, resGranted.tokenId)
    ).to.be.rejectedWith("NotInWhitelist()");

    // add User2 to whitelist
    await access.addWhitelist([user2.address]);

    // User1 transfer Role0 -> User2
    access.connect(user1).transferFrom(user1.address, user2.address, resGranted.tokenId);

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

    const { owner, user1, user2, _, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // bind Role0
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selectors[0], res.roleId);
    expect(resBind.funcId).to.be.eq(funcsIdCalced[0].toHexString());

    // user1 add rights Role0
    let resGranted = await makeGrantRole(access, owner, user1, res.roleId);

    // user1 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);

    // User1 burns acces token (Role0)
    await access.connect(user1).burn(resGranted.tokenId);

    // user1 not granted function and rejected
    await expect(mockProtocol.connect(user1).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
  });
  it("bind Role0 to funct1 granted user1, user2, check user1, user2 accessed to func1, unbind Role0 from func1 - user1, user2 has no access", async () => {
    /**
      Users granted roles         func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |    V   |            User1 |    V   |   Yes   |
      User2 |    V   |            User2 |    V   |   Yes   |

      Owner unbind Role0 from func1

      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |        |            User1 |        |   No    |
      User2 |        |            User2 |        |   No    |
     */

    const { owner, user1, user2, _, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // bind Role0
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selectors[0], res.roleId);
    expect(resBind.funcId).to.be.eq(funcsIdCalced[0].toHexString());

    // user1, user2 add rights Role0
    await makeGrantRole(access, owner, user1, res.roleId);
    await makeGrantRole(access, owner, user2, res.roleId);

    // user1, user2 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);
    await mockProtocol.connect(user2).externalAccFunc1(1);

    // unbind Role0
    let resUnbind = await makeUnbindRole(access, owner, mockProtocol.address, selectors[0], res.roleId);
    expect(resUnbind.funcId).to.be.eq(funcsIdCalced[0].toHexString());

    // unbind Role0 again - nothing happend
    let resUnbindRepeatedTx = await access.connect(owner).unbindRole(mockProtocol.address, selectors[0], res.roleId);
    expect((await resUnbindRepeatedTx.wait()).events.length).to.be.eq(0);

    // user1, user2 has not granted to func1
    await expect(mockProtocol.connect(user1).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user2).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
  });
  it("bind Role0 to funct1 granted user1, check user1 accessed to func1, rename Role0 to NewRole - user1 remains access", async () => {
    /**
      Users granted roles         func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |    V   |            User1 |    V   |   Yes   |
      User2 |        |            User2 |        |   No    |

      Owner rename Role0 to NewRole

      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  | NewRole|  Granted|
      ------+--------+            ------+--------+---------+
      User1 |    V   |            User1 |    V   |   Yes   |
      User2 |        |            User2 |        |   No    |
     */

    const { owner, user1, user2, _, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // bind Role0
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selectors[0], res.roleId);
    expect(resBind.funcId).to.be.eq(funcsIdCalced[0].toHexString());

    // user1 add rights Role0
    await makeGrantRole(access, owner, user1, res.roleId);

    // user1 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);

    // user2 has no granted function
    await expect(mockProtocol.connect(user2).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");

    // owner rename Role0 -> NewRole
    let resRename = await makeRenameRole(access, owner, res.roleId, "NewRole");
    expect(ethers.utils.toUtf8String(resRename.role).replace(/\0/g, "")).to.be.eq("NewRole");
    expect(ethers.utils.toUtf8String(await access.roles(res.roleId)).replace(/\0/g, "")).to.be.eq("NewRole");
  });
  it("try to add roles more than 256 available, grant 255th role for user1 and check", async () => {
    /**
      Users granted roles            func1 binded roles
      ------+---------+            ------+---------+----------+
            | Role255 |                  | Role255 |  Granted |
      ------+---------+            ------+---------+----------+
      User1 |    V    |            User1 |    V    |    Yes   |
      User2 |         |            User2 |         |    No    |
     */
    let res = [];
    const { owner, user1, user2, _, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add 256 roles [0..255]
    for (const iterator of Array(256).keys()) {
      res.push(await makeAddRole(access, owner, "Role" + iterator.toString()));
    }

    // added 256 roles
    expect(res.length).to.be.eq(256);

    // try to add one more role that extends role limit
    await expect(makeAddRole(access, owner, "Role256")).to.be.rejectedWith("MaxRolesReached()");

    // bind to maximum (of 256) role -> Role255
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selectors[0], res[255].roleId);
    expect(resBind.funcId).to.be.eq(funcsIdCalced[0].toHexString());

    // user1 add rights Role255
    await makeGrantRole(access, owner, user1, res[255].roleId);

    // user1 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);

    // user2 has no granted function
    await expect(mockProtocol.connect(user2).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
  });
  it("try to add role to user that already have this role", async () => {
    /**
      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |    V   |            User1 |    V   |   Yes   |
      User2 |    V   |            User2 |    V   |   Yes   |
      User3 |        |            User3 |        |   No    |

      User1 try transfer Role0 -> User2, but User2 already have Role0

      User1 transfer Role0 -> User3

      User granted roles          func1 binded roles
      ------+--------+            ------+--------+---------+
            |  Role0 |                  |  Role0 |  Granted|
      ------+--------+            ------+--------+---------+
      User1 |        |            User1 |        |   No    |
      User2 |    V   |            User2 |    V   |   Yes   |
      User3 |    V   |            User3 |    V   |   Yes   |
     */

    const { owner, user1, user2, user3, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // bind Role0
    let resBind = await makeBindRole(access, owner, mockProtocol.address, selectors[0], res.roleId);
    expect(resBind.funcId).to.be.eq(funcsIdCalced[0].toHexString());

    // user1, user2 add same rights Role0
    let resGranted1 = await makeGrantRole(access, owner, user1, res.roleId);
    let resGranted2 = await makeGrantRole(access, owner, user2, res.roleId);

    // user1, user2 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);
    await mockProtocol.connect(user2).externalAccFunc1(1);

    // user3 has not granted function
    await expect(mockProtocol.connect(user3).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");

    // User1, User2 whitelisted
    await access.addWhitelist([user1.address, user2.address, user3.address]);

    // remove User2 from whitelist
    await access.removeWhitelist([user2.address]);

    // user1 try transfer Role0 -> user2, User2 not in whitelist
    await expect(
      access.connect(user1).transferFrom(user1.address, user2.address, resGranted1.tokenId)
    ).to.be.rejectedWith("NotInWhitelist()");

    // User2 whitelisted
    await access.addWhitelist([user2.address]);

    // user1 try transfer Role0 -> user2
    await expect(
      access.connect(user1).transferFrom(user1.address, user2.address, resGranted1.tokenId)
    ).to.be.rejectedWith("RoleAlreadyGranted()");

    // user1 transfer Role0 -> user3
    access.connect(user1).transferFrom(user1.address, user3.address, resGranted1.tokenId);

    // user1 has not granted function
    await expect(mockProtocol.connect(user1).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");

    // user2, user3 has granted function
    await mockProtocol.connect(user2).externalAccFunc1(1);
    await mockProtocol.connect(user3).externalAccFunc1(1);
  });
  it("check granted user accessed only to functions with role access, not granted user has no access", async () => {
    /**
      Bind functions to roles
      ------+--------+---------+---------
            |  Role0 |  Role1  |  Role2
      ------+--------+---------+---------
      Func1 |    V   |         |         
      Func2 |        |    V    |         
      Func3 |        |         |    V
      
      User granted roles
      ------+--------+---------+---------
            |  Role0 |  Role1  |  Role2
      ------+--------+---------+---------
      User1 |        |    V    |         
      User2 |    V   |         |         
      User3 |        |         |    V


      func1 user access             func2 user access             func3 user access             
      ------+--------+----------    ------+--------+----------    ------+--------+----------     
            |  Role0 |  Granted           |  Role1 |  Granted           |  Role2 |  Granted     
      ------+--------+----------    ------+--------+----------    ------+--------+----------    
      User1 |        |    No        User1 |    V   |    Yes       User1 |        |    No        
      User2 |    V   |    Yes       User2 |        |    No        User2 |        |    No       
      User3 |        |    No        User3 |        |    No        User3 |    V   |    Yes        

      User2, User3 pass its role tokens to User1

      func1 user access             func2 user access             func3 user access             
      ------+--------+----------    ------+--------+----------    ------+--------+----------     
            |  Role0 |  Granted           |  Role1 |  Granted           |  Role2 |  Granted     
      ------+--------+----------    ------+--------+----------    ------+--------+----------    
      User1 |    V   |    Yes       User1 |    V   |    Yes       User1 |    V   |    Yes        
      User2 |        |    No        User2 |        |    No        User2 |        |    No       
      User3 |        |    No        User3 |        |    No        User3 |        |    No        

     */
    const { owner, user1, user2, user3, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add roles
    let res = [];
    for (const i of Array(3).keys()) {
      res.push(await makeAddRole(access, owner, "Role" + (i + 1).toString()));
    }

    // make role datas binding parameters Role0-Func1, Role1-Func2, Role2-Func3 to
    let roleDatas = [];
    for (const i of Array(3).keys()) {
      roleDatas.push({ target: mockProtocol.address, selector: selectors[i], roleId: res[i].roleId.toString() });
    }

    // try bindRoles from not owner
    await expect(makeBindRoles(access, user1, roleDatas)).to.be.revertedWith("Ownable: caller is not the owner");

    let resBindRoles = await makeBindRoles(access, owner, roleDatas);
    for (const i of Array(3).keys()) {
      expect(resBindRoles.funcIds[i]).to.be.eq(funcsIdCalced[i].toHexString());
    }

    // add rights
    let resGranted = [];
    resGranted.push(await makeGrantRole(access, owner, user1, res[1].roleId)); // role 1
    resGranted.push(await makeGrantRole(access, owner, user2, res[0].roleId)); // role 0
    resGranted.push(await makeGrantRole(access, owner, user3, res[2].roleId)); // role 2

    // user1 and user2 has granted function
    await mockProtocol.connect(user1).externalAccFunc2(1);
    await mockProtocol.connect(user2).externalAccFunc1(1);
    await mockProtocol.connect(user3).externalAccFunc3(1);

    // user1 not granted to functions 1,3 and rejected
    await expect(mockProtocol.connect(user1).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user1).externalAccFunc3(1)).to.be.rejectedWith("AccessNotGranted()");

    // user2 not granted to functions 2,3 and rejected
    await expect(mockProtocol.connect(user2).externalAccFunc2(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user2).externalAccFunc3(1)).to.be.rejectedWith("AccessNotGranted()");

    // user3 not granted to functions 1,2 and rejected
    await expect(mockProtocol.connect(user3).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user3).externalAccFunc2(1)).to.be.rejectedWith("AccessNotGranted()");

    // User1, User2, User3 to whitelist, allow transfers
    await access.addWhitelist([user1.address, user2.address, user3.address]);

    // User2, User3 pass its role tokens to User1
    await access.connect(user2).transferFrom(user2.address, user1.address, resGranted[1].tokenId);
    await access.connect(user3).transferFrom(user3.address, user1.address, resGranted[2].tokenId);

    // user1 granted to functions 1,2,3
    await mockProtocol.connect(user1).externalAccFunc1(1);
    await mockProtocol.connect(user1).externalAccFunc2(1);
    await mockProtocol.connect(user1).externalAccFunc3(1);

    // user2 not granted to functions 1,2,3 and rejected
    await expect(mockProtocol.connect(user2).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user2).externalAccFunc2(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user2).externalAccFunc3(1)).to.be.rejectedWith("AccessNotGranted()");

    // user3 not granted to functions 1,2,3 and rejected
    await expect(mockProtocol.connect(user3).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user3).externalAccFunc2(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user3).externalAccFunc3(1)).to.be.rejectedWith("AccessNotGranted()");
  });
  it("check granted user accessed only to functions with role access, not granted user has no access, admin burn all franted tokens", async () => {
    /**
      Bind functions to roles
      ------+--------+---------+---------
            |  Role0 |  Role1  |  Role2
      ------+--------+---------+---------
      Func1 |    V   |         |         
      Func2 |        |    V    |         
      Func3 |        |         |    V
      
      User granted roles
      ------+--------+---------+---------
            |  Role0 |  Role1  |  Role2
      ------+--------+---------+---------
      User1 |        |    V    |         
      User2 |    V   |         |         
      User3 |        |         |    V


      func1 user access             func2 user access             func3 user access             
      ------+--------+----------    ------+--------+----------    ------+--------+----------     
            |  Role0 |  Granted           |  Role1 |  Granted           |  Role2 |  Granted     
      ------+--------+----------    ------+--------+----------    ------+--------+----------    
      User1 |        |    No        User1 |    V   |    Yes       User1 |        |    No        
      User2 |    V   |    Yes       User2 |        |    No        User2 |        |    No       
      User3 |        |    No        User3 |        |    No        User3 |    V   |    Yes        

      Admin burn tokens owned by User1, User2, User3

      func1 user access             func2 user access             func3 user access             
      ------+--------+----------    ------+--------+----------    ------+--------+----------     
            |  Role0 |  Granted           |  Role1 |  Granted           |  Role2 |  Granted     
      ------+--------+----------    ------+--------+----------    ------+--------+----------    
      User1 |        |    No        User1 |        |    No        User1 |        |    No        
      User2 |        |    No        User2 |        |    No        User2 |        |    No       
      User3 |        |    No        User3 |        |    No        User3 |        |    No        

     */
    const { owner, user1, user2, user3, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add roles
    let res = [];
    for (const i of Array(3).keys()) {
      res.push(await makeAddRole(access, owner, "Role" + (i + 1).toString()));
    }

    // make role datas binding parameters Role0-Func1, Role1-Func2, Role2-Func3 to
    let roleDatas = [];
    for (const i of Array(3).keys()) {
      roleDatas.push({ target: mockProtocol.address, selector: selectors[i], roleId: res[i].roleId.toString() });
    }

    // try bindRoles from not owner
    await expect(makeBindRoles(access, user1, roleDatas)).to.be.revertedWith("Ownable: caller is not the owner");

    let resBindRoles = await makeBindRoles(access, owner, roleDatas);
    for (const i of Array(3).keys()) {
      expect(resBindRoles.funcIds[i]).to.be.eq(funcsIdCalced[i].toHexString());
    }

    // add rights
    let resGranted = [];
    resGranted.push(await makeGrantRole(access, owner, user1, res[1].roleId)); // role 1
    resGranted.push(await makeGrantRole(access, owner, user2, res[0].roleId)); // role 0
    resGranted.push(await makeGrantRole(access, owner, user3, res[2].roleId)); // role 2

    // user1 and user2 has granted function
    await mockProtocol.connect(user1).externalAccFunc2(1);
    await mockProtocol.connect(user2).externalAccFunc1(1);
    await mockProtocol.connect(user3).externalAccFunc3(1);

    // Some User (not owner) try to burn user3 token
    await expect(access.connect(user1).burnToken(resGranted[2].tokenId)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    // Admin (owner) burn access tokens from User1, User2, User3
    for (const i of Array(3).keys()) {
      await access.connect(owner).burnToken(resGranted[i].tokenId);
    }

    await expect(mockProtocol.connect(user1).externalAccFunc2(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user2).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
    await expect(mockProtocol.connect(user3).externalAccFunc3(1)).to.be.rejectedWith("AccessNotGranted()");
  });
  it("bind / unbind same roles", async () => {
    /**
      Bind functions to roles 3 times      Bind functions to roles 3 times      Bind functions to roles 3 times    
      ------+--------+---------+---------  ------+--------+---------+---------  ------+--------+---------+---------  
            |  Role0 |  Role1  |  Role2          |  Role0 |  Role1  |  Role2          |  Role0 |  Role1  |  Role2    
      ------+--------+---------+---------  ------+--------+---------+---------  ------+--------+---------+---------   
      Func1 |    V   |         |           Func1 |    V   |         |           Func1 |    V   |         |            

      Actually only 1 event for 1 role bound

      ------+--------+---------+---------
            |  Role0 |  Role1  |  Role2
      ------+--------+---------+---------
      Func1 |    V   |         |
     */
    const { owner, user1, user2, user3, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add 3 roles
    let res = [];
    for (const i of Array(3).keys()) {
      res.push(await makeAddRole(access, owner, "Role" + (i + 1).toString()));
    }

    // make 3 times role datas binding same parameters [Role0-Func1, Role0-Func1, Role0-Func1]
    let roleDatas = [];
    for (const i of Array(3).keys()) {
      roleDatas.push({ target: mockProtocol.address, selector: selectors[0], roleId: res[0].roleId.toString() });
    }

    let resBindRoles = await makeBindRoles(access, owner, roleDatas);

    // only 1 event for only 1 role bound
    expect(resBindRoles.roleIds.length).to.be.eq(1);
    expect(resBindRoles.roleIds[0]).to.be.eq(res[0].roleId);
  });
  it("check admin whitelisted by default", async () => {
    const { owner, user1, user2, user3, selectors, funcsIdCalced, access, mockProtocol } = await loadFixture(
      deployContracts
    );

    // add role
    let res = await makeAddRole(access, owner, "Role0");

    // make role datas binding parameters Role0-Func1, Role1-Func2, Role2-Func3 to
    let roleDatas = [];
    roleDatas.push({ target: mockProtocol.address, selector: selectors[0], roleId: res.roleId.toString() });

    // bindRole
    await makeBindRoles(access, owner, roleDatas);

    // owner not granted
    await expect(mockProtocol.connect(owner).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");

    // add rights to owner
    let resGranted = await makeGrantRole(access, owner, owner, res.roleId);

    // owner has granted function
    await mockProtocol.connect(owner).externalAccFunc1(1);

    // owner not whitelisted transfer role tokento user 1
    await access.connect(owner).transferFrom(owner.address, user1.address, resGranted.tokenId);

    // user1 has granted function
    await mockProtocol.connect(user1).externalAccFunc1(1);

    // owner not granted
    await expect(mockProtocol.connect(owner).externalAccFunc1(1)).to.be.rejectedWith("AccessNotGranted()");
  });
});
