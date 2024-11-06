// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import "./Access.sol";

/// @title Azuro Access token helps manage access to sensitive contract functionality.
contract MockAccessUpgraded is Access {
    function version() external view returns (string memory) {
        return "v0.0.2";
    }
}
