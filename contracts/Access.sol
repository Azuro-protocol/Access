// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./interface/IAccess.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Access is Ownable, ERC721, IAccess {
    uint256 public nextRole;

    mapping(uint256 => bytes32) public roles;

    // function's binded roles
    mapping(bytes32 => uint256) public functionRoles;

    // user's granted roles
    mapping(address => uint256) public userRoles;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {}

    function addRole(string memory roleName) external onlyOwner {
        bytes32 _role = bytes32(bytes(roleName));
        roles[nextRole] = _role;
        emit roleAdded(_role, nextRole++);
        if (nextRole > type(uint8).max) revert MaxRolesReached();
    }

    function bindRole(
        address _contract,
        bytes4 selector,
        uint8 _roleId
    ) external onlyOwner {
        bytes32 funcId = _getFunctionId(_contract, selector);
        functionRoles[funcId] = functionRoles[funcId] | (1 << _roleId);
        emit roleBinded(funcId, _roleId);
    }

    function renameRole(
        string memory roleName,
        uint8 _roleId
    ) external onlyOwner {
        bytes32 _role = bytes32(bytes(roleName));
        roles[_roleId] = _role;
        emit roleRenamed(_role, _roleId);
    }

    function unbindRole(
        address _contract,
        bytes4 selector,
        uint8 _roleId
    ) external onlyOwner {
        bytes32 funcId = _getFunctionId(_contract, selector);
        functionRoles[funcId] = functionRoles[funcId] & ~(1 << _roleId);
        emit roleUnBinded(funcId, _roleId);
    }

    function checkAccess(
        address sender,
        address _contract,
        bytes4 selector
    ) external view override {
        bytes32 funcId = _getFunctionId(_contract, selector);
        if (uint256(functionRoles[funcId] & userRoles[sender]) == 0)
            revert AccessNotGranted();
    }

    //@dev this function supposed to be internal and used in ERC721 transfer
    function grantRole(address user, uint8 _roleId) external {
        userRoles[user] = userRoles[user] | (1 << _roleId);
        emit roleGranted(user, _roleId);
    }

    //@dev this function supposed to be internal and used in ERC721 transfer
    function revokeRole(address user, uint8 _roleId) external {
        userRoles[user] = userRoles[user] | (1 << _roleId);
        emit roleRevoked(user, _roleId);
    }

    function _getFunctionId(
        address _contract,
        bytes4 selector
    ) internal pure returns (bytes32) {
        return
            bytes32(abi.encodePacked(_contract)) | (bytes32(selector) >> 224);
    }
}
