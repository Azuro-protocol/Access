// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./interface/IAccess.sol";

contract MockProtocol {
    uint256 someVar;
    address owner;
    IAccess access;

    modifier onlyEmbedded() {
        _checkEmbeddedAccess(msg.sender);
        _;
    }

    modifier onlyAccess(bytes4 selector) {
        access.checkAccess(msg.sender, address(this), selector);
        _;
    }

    error OnlyOwner();

    constructor(address access_) {
        owner = msg.sender;
        access = IAccess(access_);
    }

    function embeddedAccFunc1(uint256 someValue) external onlyEmbedded {
        someVar += someValue;
    }

    function externalAccFunc1(
        uint256 someValue
    ) external onlyAccess(this.externalAccFunc1.selector) {
        someVar += someValue;
    }

    function externalAccFunc2(
        uint256 someValue
    ) external onlyAccess(this.externalAccFunc2.selector) {
        someVar += someValue;
    }

    function externalAccFunc3(
        uint256 someValue
    ) external onlyAccess(this.externalAccFunc3.selector) {
        someVar += someValue;
    }

    function _checkEmbeddedAccess(address sender) internal view {
        if (sender != owner) revert OnlyOwner();
    }
}
