const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const proxyModule = buildModule("ProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  // Deploy the implementation of the `Access` contract
  const implementation = m.contract("Access");

  // Encode the initialize function call for the `Access` contract.
  const initialize = m.encodeFunctionCall(implementation, "initialize", ["Access NFT token", "AccNFT"]);

  // Deploy proxy, pointing to the implementation
  const proxy = m.contract("TransparentUpgradeableProxy", [implementation, proxyAdminOwner, initialize]);

  // We need to get the address of the ProxyAdmin contract that was created by the TransparentUpgradeableProxy
  // so that we can use it to upgrade the proxy later.
  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxy, proxyAdmin };
});

const accessModule = buildModule("AccessModule", (m) => {
  // Get the proxy and proxy admin from the previous module.
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  // Connect to proxy with Access interface
  const access = m.contractAt("Access", proxy);

  return { access, proxy, proxyAdmin };
});

module.exports = accessModule;
