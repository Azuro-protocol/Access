// SPDX-License-Identifier: MIT

pragma solidity 0.8.27;

interface IAccessMetadata {
    struct RoleData {
        address target; // target contract address
        bytes4 selector; // target function selector
        uint8 roleId; // ID of the role associated with contract-function combination
    }

    struct TokenTransferability {
        uint256 tokenId;
        bool isNonTransferable;
    }

    event RoleAdded(bytes32 indexed role, uint256 indexed roleId);
    event RoleRenamed(bytes32 indexed role, uint8 indexed roleId);
    event RoleBound(bytes32 indexed funcId, uint8 indexed roleId);
    event RoleUnbound(bytes32 indexed funcId, uint8 indexed roleId);
    event RoleGranted(address indexed user, uint8 indexed roleId);
    event RoleRevoked(address indexed user, uint8 indexed roleId);

    event TokenTransferabilityChanged(uint256 tokenId, bool isNonTransferable);

    error NotTokenOwner();
    error MaxRolesReached();
    error TooBigRoleName();
    error AccessNotGranted();
    error RoleAlreadyGranted();

    error NoChanges();
    error TokenNonTransferable();
}
