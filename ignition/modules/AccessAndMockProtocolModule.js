const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const AccessModule = require("./AccessModule");

module.exports = buildModule("AccessAndMockProtocolModule", (m) => {
  const { access } = m.useModule(AccessModule);

  // deploy mock rpotocol contract using access
  const mockProtocol = m.contract("MockProtocol", [access]);

  return { access, mockProtocol };
});
