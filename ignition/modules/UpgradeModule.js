const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const ProxyModule = require("./ProxyModule");

const upgradeModule = buildModule("UpgradeModule", (m) => {
  // Make sure we're using the account that owns the ProxyAdmin contract.
  const proxyAdminOwner = m.getAccount(0);

  // Get the proxy from the previous module.
  const { proxy, proxyAdmin } = m.useModule(ProxyModule);

  // Create an `Access` contract instance using the deployed proxy's address.
  const accessNewVersion = m.contract("MockAccessUpgraded");

  m.call(proxyAdmin, "upgradeAndCall", [proxy, accessNewVersion, "0x"], {
    from: proxyAdminOwner,
  });

  // Return the proxy and proxy admin so that they can be used by other modules.
  return { proxyAdmin, proxy };
});

const accessUpgradedModule = buildModule("AccessUpgradedModule", (m) => {
  // Get the proxy from the previous module.
  const { proxy } = m.useModule(upgradeModule);

  // Create a local contract instance for the new `access` contract.
  const access = m.contractAt("MockAccessUpgraded", proxy);

  return { access };
});

module.exports = accessUpgradedModule;
