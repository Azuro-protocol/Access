// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interface/IAccess.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Access is Ownable, ERC721, ERC721Burnable, IAccess {
    uint256 public nextRole;
    uint256 public nextTokenId;

    mapping(uint256 => bytes32) public roles;

    // function's binded roles
    mapping(bytes32 => uint256) public functionRoles;

    // user's granted roles
    mapping(address => uint256) public userRoles;

    // tokens - roles
    mapping(uint256 => uint8) public tokenRoles;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {}

    /**
     * @notice add new role
     * @param  roleName role name, string stored as fixed length type bytes32, so use short names to fit 32 characters (UTF-8 strings)
     */
    function addRole(string memory roleName) external onlyOwner {
        bytes32 _role = bytes32(bytes(roleName));
        roles[nextRole] = _role;
        emit roleAdded(_role, nextRole++);
        if (nextRole > type(uint8).max) revert MaxRolesReached();
    }

    /**
     * @notice bind access role to contract-function
     * @param  target smart contract address
     * @param  selector function selector
     * @param  roleId role id
     */
    function bindRole(
        address target,
        bytes4 selector,
        uint8 roleId
    ) external onlyOwner {
        bytes32 funcId = _getFunctionId(target, selector);
        functionRoles[funcId] = functionRoles[funcId] | (1 << roleId);
        emit roleBound(funcId, roleId);
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
        emit roleRenamed(_role, roleId);
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
        emit roleUnbound(funcId, roleId);
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
     * @notice grant access role for user
     * @param  user grant for user
     * @param  roleId grant role id
     */
    function grantRole(address user, uint8 roleId) external onlyOwner {
        uint256 _nextTokenId = nextTokenId++;
        tokenRoles[_nextTokenId] = roleId;
        _safeMint(user, _nextTokenId);
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
            if (_roleExists(to, roleId)) revert RoleAlreadyGranted();
            _grantRole(to, roleId);
        }
        // not mint
        if (from != address(0)) _revokeRole(from, roleId);
    }

    function _getFunctionId(
        address target,
        bytes4 selector
    ) internal pure returns (bytes32) {
        return bytes32(abi.encodePacked(target)) | (bytes32(selector) >> 224);
    }

    function _getRole(uint256 tokenId) internal view returns (uint8) {
        return tokenRoles[tokenId];
    }

    function _grantRole(address user, uint8 roleId) internal {
        userRoles[user] = userRoles[user] | (1 << roleId);
        emit roleGranted(user, roleId);
    }

    function _revokeRole(address user, uint8 roleId) internal {
        userRoles[user] = userRoles[user] & ~(1 << roleId);
        emit roleRevoked(user, roleId);
    }

    function _roleExists(
        address user,
        uint8 roleId
    ) public view returns (bool) {
        uint256 roleBit = 1 << roleId;
        return userRoles[user] & roleBit == roleBit;
    }
}
