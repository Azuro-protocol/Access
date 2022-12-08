// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IAccessMetadata {
    struct RoleData {
        address target;
        bytes4 selector;
        uint8 roleId;
    }

    event RoleAdded(bytes32 role, uint256 roleId);
    event RoleRenamed(bytes32 role, uint256 roleId);
    event RoleBound(bytes32 funcId, uint8 roleId);
    event RoleUnbound(bytes32 funcId, uint8 roleId);
    event RoleGranted(address user, uint8 roleId);
    event RoleRevoked(address user, uint8 roleId);

    error MaxRolesReached();
    error AccessNotGranted();
    error RoleAlreadyGranted();
    error NotInWhitelist();
}
