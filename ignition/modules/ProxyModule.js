const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ProxyModule", (m) => {
  // Deploy the implementation of the `Access` contract
  const implementation = m.contract("Access");

  // Encode the initialize function call for the `Access` contract.
  const initialize = m.encodeFunctionCall(implementation, "initialize", ["Access NFT token", "AccNFT"]);

  const owner = m.getAccount(0);

  // Deploy proxy, pointing to the implementation
  const proxy = m.contract("TransparentUpgradeableProxy", [implementation, owner, initialize]);

  return { proxy };
});
