const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const UpgradeModule = require("./UpgradeModule");

module.exports = buildModule("AccessAndMockProtocolModule", (m) => {
  const { access } = m.useModule(UpgradeModule);

  // deploy mock protocol contract using access
  const mockProtocol = m.contract("MockProtocol", [access]);

  return { access, mockProtocol };
});
