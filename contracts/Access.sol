// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interface/IAccess.sol";
import "./interface/IAccessMetadata.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Access is
    OwnableUpgradeable,
    ERC721BurnableUpgradeable,
    IAccessMetadata,
    IAccess
{
    uint256 public nextRole;
    uint256 public nextTokenId;

    mapping(uint256 => bytes32) public roles;

    // function's binded roles
    mapping(bytes32 => uint256) public functionRoles;

    // user's granted roles
    mapping(address => uint256) public userRoles;

    // tokens - roles
    mapping(uint256 => uint8) public tokenRoles;

    function initialize(
        string memory name_,
        string memory symbol_
    ) external initializer {
        __Ownable_init_unchained();
        __ERC721_init(name_, symbol_);
    }

    /**
     * @notice add new role
     * @param  roleName role name, string stored as fixed length type bytes32, so use short names to fit 32 characters (UTF-8 strings)
     */
    function addRole(string memory roleName) external onlyOwner {
        if (nextRole > type(uint8).max) revert MaxRolesReached();
        bytes32 _role = bytes32(bytes(roleName));
        roles[nextRole] = _role;
        emit RoleAdded(_role, nextRole++);
    }

    /**
     * @notice bind access role to contract-function
     * @param  role structure parameter RoleData {target, selector, roleId}
     */
    function bindRole(RoleData calldata role) external onlyOwner {
        _bindRole(role);
    }

    /**
     * @notice bind access role to contract-function by provided list
     * @param  RoleDatas list of structure RoleData {target, selector, roleId}
     */
    function bindRoles(RoleData[] calldata RoleDatas) external onlyOwner {
        uint256 roleCount = RoleDatas.length;
        for (uint256 index = 0; index < roleCount; index++) {
            _bindRole(RoleDatas[index]);
        }
    }

    /**
     * @notice revoke access token from user by its burning
     * @param  tokenId role token id to be burned
     */
    function burnToken(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }

    /**
     * @notice grant access role for user
     * @param  user grant for user
     * @param  roleId grant role id
     */
    function grantRole(address user, uint8 roleId) external onlyOwner {
        uint256 _nextTokenId = nextTokenId++;
        tokenRoles[_nextTokenId] = roleId;
        _safeMint(user, _nextTokenId);
    }

    /**
     * @notice rename access role
     * @param  roleName new role name
     * @param  roleId role id
     */
    function renameRole(
        string memory roleName,
        uint8 roleId
    ) external onlyOwner {
        bytes32 _role = bytes32(bytes(roleName));
        roles[roleId] = _role;
        emit RoleRenamed(_role, roleId);
    }

    /**
     * @notice unbind access role from contract-function
     * @param  target smart contract address
     * @param  selector function selector
     * @param  roleId role id
     */
    function unbindRole(
        address target,
        bytes4 selector,
        uint8 roleId
    ) external onlyOwner {
        bytes32 funcId = _getFunctionId(target, selector);
        functionRoles[funcId] = functionRoles[funcId] & ~(1 << roleId);
        emit RoleUnbound(funcId, roleId);
    }

    /**
     * @notice sender check access for contract-selector by granted group
     * @param  sender sender account
     * @param  target smart contract to check access
     * @param  selector function selector to check access
     */
    function checkAccess(
        address sender,
        address target,
        bytes4 selector
    ) external view override {
        if (
            (functionRoles[_getFunctionId(target, selector)] &
                userRoles[sender]) == 0
        ) revert AccessNotGranted();
    }

    /**
     * @notice get function Id from contract-function
     * @param  target smart contract address
     * @param  selector function selector
     * @return function id
     */
    function getFunctionId(
        address target,
        bytes4 selector
    ) external pure returns (bytes32) {
        return _getFunctionId(target, selector);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 // unused parameter - silence warning
    ) internal virtual override {
        uint8 roleId = tokenRoles[firstTokenId];
        // not burn
        if (to != address(0)) {
            if (_roleGranted(to, roleId)) revert RoleAlreadyGranted();
            _grantRole(to, roleId);
        }
        // not mint
        if (from != address(0)) _revokeRole(from, roleId);
    }

    function _bindRole(RoleData calldata role) internal {
        bytes32 funcId = _getFunctionId(role.target, role.selector);
        functionRoles[funcId] = functionRoles[funcId] | (1 << role.roleId);
        emit RoleBound(funcId, role.roleId);
    }

    function _getFunctionId(
        address target,
        bytes4 selector
    ) internal pure returns (bytes32) {
        return bytes32(abi.encodePacked(target)) | (bytes32(selector) >> 224);
    }

    function _grantRole(address user, uint8 roleId) internal {
        userRoles[user] = userRoles[user] | (1 << roleId);
        emit RoleGranted(user, roleId);
    }

    function _revokeRole(address user, uint8 roleId) internal {
        userRoles[user] = userRoles[user] & ~(1 << roleId);
        emit RoleRevoked(user, roleId);
    }

    function _roleGranted(
        address user,
        uint8 roleId
    ) public view returns (bool) {
        uint256 roleBit = 1 << roleId;
        return userRoles[user] & roleBit == roleBit;
    }
}
