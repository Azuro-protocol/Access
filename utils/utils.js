const { ethers } = require("hardhat");

async function getEventFromTx(express, tx, eventName) {
  const receipt = await tx.wait();
  let iface = new ethers.utils.Interface(
    express.interface.format(ethers.utils.FormatTypes.full).filter((x) => {
      return x.includes(eventName);
    })
  );

  let event;
  for (const log of receipt.logs) {
    if (log.topics[0] == iface.getEventTopic(iface.fragments[0])) {
      event = iface.parseLog(log).args;
      break;
    }
  }

  const gas = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);
  return [event, gas];
}

async function getEventsFromTx(express, tx, eventName) {
  const receipt = await tx.wait();
  let iface = new ethers.utils.Interface(
    express.interface.format(ethers.utils.FormatTypes.full).filter((x) => {
      return x.includes(eventName);
    })
  );

  let events = [];
  for (const log of receipt.logs) {
    if (log.topics[0] == iface.getEventTopic(iface.fragments[0])) {
      events.push(iface.parseLog(log).args);
    }
  }

  const gas = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);
  return [events, gas];
}

const getChangeTokenTransferability = async (access, tx) => {
  let [event, gas] = await getEventFromTx(access, tx, "TokenTransferabilityChanged");
  return { tokenId: event.tokenId, isNonTransferable: event.isNonTransferable, gasUsed: gas };
};

const getChangeTokensTransferability = async (access, tx) => {
  let [events, gas] = await getEventsFromTx(access, tx, "TokenTransferabilityChanged");
  return { events: events, gasUsed: gas };
};

const getRoleAddedDetails = async (access, tx) => {
  let [event, gas] = await getEventFromTx(access, tx, "RoleAdded");
  return { role: event.role, roleId: event.roleId, gasUsed: gas };
};

const getRoleRenamedDetails = async (access, tx) => {
  let [event, gas] = await getEventFromTx(access, tx, "RoleRenamed");
  return { role: event.role, roleId: event.roleId, gasUsed: gas };
};

const getRoleBoundDetails = async (access, tx) => {
  let [event, gas] = await getEventFromTx(access, tx, "RoleBound");
  return { funcId: event.funcId, roleId: event.roleId, gasUsed: gas };
};

const getRolesBoundDetails = async (access, tx) => {
  let [events, gas] = await getEventsFromTx(access, tx, "RoleBound");
  let funcIds = [];
  let roleIds = [];
  for (const i of events.keys()) {
    funcIds.push(events[i].funcId);
    roleIds.push(events[i].roleId);
  }
  return { funcIds: funcIds, roleIds: roleIds, gasUsed: gas };
};

const getRoleUnboundDetails = async (access, tx) => {
  let [event, gas] = await getEventFromTx(access, tx, "RoleUnbound");
  return { funcId: event.funcId, roleId: event.roleId, gasUsed: gas };
};

const getRoleGrantedDetails = async (access, tx) => {
  let [event, gas] = await getEventFromTx(access, tx, "RoleGranted");
  return { user: event.user, roleId: event.roleId, gasUsed: gas };
};

const getTransferNFTTokenDetails = async (access, tx) => {
  let [event, gas] = await getEventFromTx(access, tx, "Transfer(");
  return { from: event.from, to: event.to, tokenId: event.tokenId, gasUsed: gas };
};

const makeAddRole = async (access, owner, roleName) => {
  let tx = await access.connect(owner).addRole(roleName);
  let res = await getRoleAddedDetails(access, tx);
  return { role: res.role, roleId: res.roleId };
};

const makeRenameRole = async (access, owner, roleId, newRoleName) => {
  let tx = await access.connect(owner).renameRole(roleId, newRoleName);
  let res = await getRoleRenamedDetails(access, tx);
  return { role: res.role, roleId: res.roleId };
};

const makeBindRole = async (access, owner, contract, selector, roleId) => {
  let tx = await access.connect(owner).bindRole({ target: contract, selector: selector, roleId: roleId.toString() });
  let res = await getRoleBoundDetails(access, tx);
  return { funcId: res.funcId, roleId: res.roleId };
};

const makeBindRoles = async (access, owner, roleDatas) => {
  let tx = await access.connect(owner).bindRoles(roleDatas);
  let res = await getRolesBoundDetails(access, tx);
  return { funcIds: res.funcIds, roleIds: res.roleIds };
};

const makeChangeTokenTransferability = async (access, owner, tokenId, isNonTransferable) => {
  let tx = await access.connect(owner).changeTokenTransferability(tokenId, isNonTransferable);
  let res = await getChangeTokenTransferability(access, tx);
  return { funcIds: res.tokenId, roleIds: res.isNonTransferable };
};

const makeChangeBatchTokenTransferability = async (access, owner, tokens, nonTransferabilities) => {
  let tokenTransferability = [];
  for (const i of tokens.keys()) {
    tokenTransferability.push({ tokenId: tokens[i], isNonTransferable: nonTransferabilities[i] });
  }
  let tx = await access.connect(owner).changeBatchTokenTransferability(tokenTransferability);
  let res = await getChangeTokensTransferability(access, tx);

  let resTokens = [];
  let isNonTransferables = [];
  for (const i of res.events.keys()) {
    resTokens.push(res.events[i].tokenId);
    isNonTransferables.push(res.events[i].isNonTransferable);
  }
  return { tokens: resTokens, isNonTransferables: isNonTransferables };
};

const makeUnbindRole = async (access, owner, contract, selector, roleId) => {
  let tx = await access.connect(owner).unbindRole({ target: contract, selector: selector, roleId: roleId });
  let res = await getRoleUnboundDetails(access, tx);
  return { funcId: res.funcId, roleId: res.roleId };
};

const makeGrantRole = async (access, owner, user, roleId) => {
  let tx = await access.connect(owner).grantRole(user.address, roleId);
  let res = await getRoleGrantedDetails(access, tx);
  let tranferRes = await getTransferNFTTokenDetails(access, tx);
  return { user: res.user, roleId: res.roleId, from: tranferRes.from, to: tranferRes.to, tokenId: tranferRes.tokenId };
};

const makeGrantRoleNonTransferable = async (access, owner, user, roleId) => {
  let tx = await access.connect(owner).grantRoleTransferable(user.address, roleId, true);
  let res = await getRoleGrantedDetails(access, tx);
  let tranferRes = await getTransferNFTTokenDetails(access, tx);
  return { user: res.user, roleId: res.roleId, from: tranferRes.from, to: tranferRes.to, tokenId: tranferRes.tokenId };
};

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getRoleAddedDetails,
  getRoleBoundDetails,
  getRoleUnboundDetails,
  getRoleGrantedDetails,
  makeAddRole,
  makeRenameRole,
  makeBindRole,
  makeBindRoles,
  makeChangeBatchTokenTransferability,
  makeChangeTokenTransferability,
  makeUnbindRole,
  makeGrantRole,
  makeGrantRoleNonTransferable,
  timeout,
};
