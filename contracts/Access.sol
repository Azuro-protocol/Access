// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interface/IAccess.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Access is Ownable, ERC721, IAccess {
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
     * @param  roleName role name
     */
    function addRole(string memory roleName) external onlyOwner {
        bytes32 _role = bytes32(bytes(roleName));
        roles[nextRole] = _role;
        emit roleAdded(_role, nextRole++);
        if (nextRole > type(uint8).max) revert MaxRolesReached();
    }

    /**
     * @notice bind access role to contract-function
     * @param  _contract smart contract address
     * @param  selector function selector
     * @param  roleId role id
     */
    function bindRole(
        address _contract,
        bytes4 selector,
        uint8 roleId
    ) external onlyOwner {
        bytes32 funcId = _getFunctionId(_contract, selector);
        functionRoles[funcId] = functionRoles[funcId] | (1 << roleId);
        emit roleBinded(funcId, roleId);
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
     * @param  _contract smart contract address
     * @param  selector function selector
     * @param  roleId role id
     */
    function unbindRole(
        address _contract,
        bytes4 selector,
        uint8 roleId
    ) external onlyOwner {
        bytes32 funcId = _getFunctionId(_contract, selector);
        functionRoles[funcId] = functionRoles[funcId] & ~(1 << roleId);
        emit roleUnBinded(funcId, roleId);
    }

    /**
     * @notice sender check access for contract-selector by granted group
     * @param  sender sender account
     * @param  _contract smart contract to check access
     * @param  selector function selector to check access
     */
    function checkAccess(
        address sender,
        address _contract,
        bytes4 selector
    ) external view override {
        if (
            (functionRoles[_getFunctionId(_contract, selector)] &
                userRoles[sender]) == 0
        ) revert AccessNotGranted();
    }

    /**
     * @notice grant access role for user 
     * @param  user grant for user 
     * @param  roleId grant role id 
     */
    function grantRole(address user, uint8 roleId) external onlyOwner {
        tokenRoles[nextTokenId] = roleId;
        _safeMint(user, nextTokenId++);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 // unused parameter - silence warning
    ) internal virtual override {
        uint8 roleId = tokenRoles[firstTokenId];
        if (to != address(0) && _roleExists(to, roleId))
            revert RoleAlreadyGranted();
        // not mint
        if (from != address(0)) _revokeRole(from, roleId);
        // not burn
        if (to != address(0)) _grantRole(to, roleId);
    }

    function _getFunctionId(
        address _contract,
        bytes4 selector
    ) internal pure returns (bytes32) {
        return
            bytes32(abi.encodePacked(_contract)) | (bytes32(selector) >> 224);
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
