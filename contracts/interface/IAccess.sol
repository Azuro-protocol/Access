// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IAccess {
    event roleAdded(bytes32 role, uint256 roleId);
    event roleRenamed(bytes32 role, uint256 roleId);
    event roleBound(bytes32 funcId, uint8 roleId);
    event roleUnbound(bytes32 funcId, uint8 roleId);
    event roleGranted(address user, uint8 roleId);
    event roleRevoked(address user, uint8 roleId);

    error MaxRolesReached();
    error AccessNotGranted();
    error RoleAlreadyGranted();

    function checkAccess(
        address sender,
        address _contract,
        bytes4 selector
    ) external;
}
