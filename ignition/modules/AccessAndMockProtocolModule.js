const { AccessModule, buildModule } = require("./AccessModule");

const accessAndMockProtocolModule = buildModule("AccessAndMockProtocolModule", (m) => {
  const { access, proxy } = m.useModule(AccessModule);

  // deploy mock rpotocol contract using access
  const mockProtocol = m.contract("MockProtocol", [access]);

  return { access, proxy, mockProtocol };
});

module.exports = accessAndMockProtocolModule;
