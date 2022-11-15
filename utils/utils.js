const { ethers } = require("hardhat");

const getroleAddedDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "roleAdded";
  });
  return { role: eAdd[0].args.role, roleId: eAdd[0].args.roleId };
};

const getroleBindedDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "roleBinded";
  });
  return { funcId: eAdd[0].args.funcId, roleId: eAdd[0].args.roleId };
};

const getroleGrantedDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "roleGranted";
  });
  return { user: eAdd[0].args.user, roleId: eAdd[0].args.roleId };
};

const makeAddRole = async (access, owner, roleName) => {
  let txAdd = await access.connect(owner).addRole(roleName);
  let res = await getroleAddedDetails(txAdd);
  return { role: res.role, roleId: res.roleId };
};

const makeBindRole = async (access, owner, contract, selector, roleId) => {
  let txAdd = await access.connect(owner).bindRole(contract, selector, roleId);
  let res = await getroleBindedDetails(txAdd);
  return { funcId: res.funcId, roleId: res.roleId };
};

const makeGrantRole = async (access, owner, user, roleId) => {
  let txAdd = await access.connect(owner).grantRole(user.address, roleId);
  let res = await getroleGrantedDetails(txAdd);
  return { user: res.user, roleId: res.roleId };
};

module.exports = {
  getroleAddedDetails,
  getroleBindedDetails,
  getroleGrantedDetails,
  makeAddRole,
  makeBindRole,
  makeGrantRole,
};
