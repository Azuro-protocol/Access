const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const ProxyModule = require("./ProxyModule");

module.exports = buildModule("AccessModule", (m) => {
  // Get the proxy from the previous module.
  const { proxy } = m.useModule(ProxyModule);

  // Create an `Access` contract instance using the deployed proxy's address.
  const access = m.contractAt("Access", proxy);

  return { access, proxy };
});
