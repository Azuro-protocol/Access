const { ethers } = require("hardhat");

const getRoleAddedDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "RoleAdded";
  });
  return { role: eAdd[0].args.role, roleId: eAdd[0].args.roleId };
};

const getRoleRenamedDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "RoleRenamed";
  });
  return { role: eAdd[0].args.role, roleId: eAdd[0].args.roleId };
};

const getRoleBoundDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "RoleBound";
  });
  return { funcId: eAdd[0].args.funcId, roleId: eAdd[0].args.roleId };
};

const getRoleUnboundDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "RoleUnbound";
  });
  return { funcId: eAdd[0].args.funcId, roleId: eAdd[0].args.roleId };
};

const getRoleGrantedDetails = async (txAdd) => {
  let eAdd = (await txAdd.wait()).events.filter((x) => {
    return x.event == "RoleGranted";
  });
  return { user: eAdd[0].args.user, roleId: eAdd[0].args.roleId };
};

const getTransferNFTTokenDetails = async (access, tx) => {
  const receipt = await tx.wait();
  let iface = new ethers.utils.Interface(
    access.interface.format(ethers.utils.FormatTypes.full).filter((x) => {
      return x.includes("Transfer");
    })
  );
  let log = iface.parseLog(receipt.logs[0]);
  return {
    from: log.args.from,
    to: log.args.to,
    tokenId: log.args.tokenId,
  };
};

const makeAddRole = async (access, owner, roleName) => {
  let txAdd = await access.connect(owner).addRole(roleName);
  let res = await getRoleAddedDetails(txAdd);
  return { role: res.role, roleId: res.roleId };
};

const makeRenameRole = async (access, owner, roleId, newRoleName) => {
  let txAdd = await access.connect(owner).renameRole(newRoleName, roleId);
  let res = await getRoleRenamedDetails(txAdd);
  return { role: res.role, roleId: res.roleId };
};

const makeBindRole = async (access, owner, contract, selector, roleId) => {
  let txAdd = await access.connect(owner).bindRole(contract, selector, roleId);
  let res = await getRoleBoundDetails(txAdd);
  return { funcId: res.funcId, roleId: res.roleId };
};

const makeUnbindRole = async (access, owner, contract, selector, roleId) => {
  let txAdd = await access.connect(owner).unbindRole(contract, selector, roleId);
  let res = await getRoleUnboundDetails(txAdd);
  return { funcId: res.funcId, roleId: res.roleId };
};

const makeGrantRole = async (access, owner, user, roleId) => {
  let txAdd = await access.connect(owner).grantRole(user.address, roleId);
  let res = await getRoleGrantedDetails(txAdd);
  let tranferRes = await getTransferNFTTokenDetails(access, txAdd);
  return { user: res.user, roleId: res.roleId, from: tranferRes.from, to: tranferRes.to, tokenId: tranferRes.tokenId };
};

module.exports = {
  getRoleAddedDetails,
  getRoleBoundDetails,
  getRoleUnboundDetails,
  getRoleGrantedDetails,
  makeAddRole,
  makeRenameRole,
  makeBindRole,
  makeUnbindRole,
  makeGrantRole,
};
