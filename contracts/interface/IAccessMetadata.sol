// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IAccessMetadata {
    struct RoleData {
        address target; // target contract address
        bytes4 selector; // target function selector
        uint8 roleId; // ID of the role associated with contract-function combination
    }

    event RoleAdded(bytes32 indexed role, uint256 roleId);
    event RoleRenamed(bytes32 indexed role, uint256 roleId);
    event RoleBound(bytes32 indexed funcId, uint8 roleId);
    event RoleUnbound(bytes32 indexed funcId, uint8 roleId);
    event RoleGranted(address indexed user, uint8 roleId);
    event RoleRevoked(address indexed user, uint8 roleId);

    error MaxRolesReached();
    error TooBigRoleName();
    error AccessNotGranted();
    error RoleAlreadyGranted();
}
