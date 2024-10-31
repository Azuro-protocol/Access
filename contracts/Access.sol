// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import "./library/Base64.sol";
import "./library/Strings.sol";
import "./interface/IAccess.sol";
import "./interface/IAccessMetadata.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title Azuro Access token helps manage access to sensitive contract functionality.
contract Access is
    OwnableUpgradeable,
    ERC721EnumerableUpgradeable,
    IAccessMetadata,
    IAccess
{
    using Strings for uint256;
    using Strings for uint8;

    uint256 public nextRole;
    uint256 public nextTokenId;

    // Mapping from role ID to role name
    mapping(uint256 => bytes32) public roles;

    // Mapping from token ID to role ID
    mapping(uint256 => uint8) public tokenRoles;

    /**
     * @notice Mapping from function ID to vector of role IDs the function is included in.
     * @notice Every role represented by bit in 256 bits (32 bytes) role vector.
     *         Access is granted by matching bits of role vectors associated with caller and called function.
     */
    mapping(bytes32 => uint256) public functionRoles;

    /**
     * @notice Mapping from account to vector of role IDs the account is associated with.
     * @notice Every role represented by bit in 256 bits (32 bytes) access vector.
     *         Access is granted by matching bits of role vectors associated with caller and called function.
     */
    mapping(address => uint256) public userRoles;

    /**
     * @notice Mapping of non transferable token ids, but tokens still can be burnt
     */
    mapping(uint256 => bool) public tokenNonTransferable;

    function initialize(
        string memory name_,
        string memory symbol_
    ) external initializer {
        __Ownable_init_unchained(msg.sender); // set ownership
        __ERC721_init(name_, symbol_);
    }

    /**
     * @notice Register new role `roleName`.
     * @notice Warning: the number of possible roles in one implementation is limited to 256.
     * @param  roleName role name is stored as bytes32 type, so use short name to fit 32 bytes with UTF-8 encoding.
     */
    function addRole(string calldata roleName) external onlyOwner {
        if (nextRole > type(uint8).max) revert MaxRolesReached();
        bytes32 _role = _roleNameToBytes(roleName);
        roles[nextRole] = _role;
        emit RoleAdded(_role, nextRole++);
    }

    /**
     * @notice Bind role with contract-function.
     * @notice See {_bindRole}.
     */
    function bindRole(RoleData calldata roleData) external onlyOwner {
        _bindRole(roleData);
    }

    /**
     * @notice Bind role with contract-function by provided list.
     * @param  rolesData array. See {IAccess-RoleData}
     */
    function bindRoles(RoleData[] calldata rolesData) external onlyOwner {
        uint256 rolesCount = rolesData.length;
        for (uint256 index = 0; index < rolesCount; index++) {
            _bindRole(rolesData[index]);
        }
    }

    /**
     * @notice change batch of tokens ability to transfer token,
     * @notice forbid transfer - set `isNonTransferable` true, set false to allow transfer
     * @param tokens is token id for change transfer ability and isNonTransferable (true - forbid token transfer)
     */
    function changeBatchTokenTransferability(
        TokenTransferability[] calldata tokens
    ) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            _changeTokenTransferability(tokens[i]);
        }
    }

    /**
     * @notice change token owner's ability to transfer token,
     * @notice forbid transfer - set `isNonTransferable` true, set false to allow transfer
     * @param tokenId token id for change transfer ability
     * @param isNonTransferable set true - forbid token transfer
     */
    function changeTokenTransferability(
        uint256 tokenId,
        bool isNonTransferable
    ) external onlyOwner {
        _changeTokenTransferability(
            TokenTransferability(tokenId, isNonTransferable)
        );
    }

    /**
     * @notice Grant role `roleId` to `account`.
     * @notice By default granted access token can be transferred by `account`,
     * @param account granting account address
     * @param roleId granting role id
     */
    function grantRole(
        address account,
        uint8 roleId
    ) public onlyOwner returns (uint256 _nextTokenId) {
        _nextTokenId = nextTokenId++;
        tokenRoles[_nextTokenId] = roleId;
        _mint(account, _nextTokenId);
        _afterTokenTransfer(address(0), account, _nextTokenId);
    }

    /**
     * @notice Grant role `roleId` to `account`.
     * @notice By default granted access token can be transferred by `account`,
     * @notice if not supposed, set `isNonTransferable` -> true
     * @param account granting account address
     * @param roleId granting role id
     * @param isNonTransferable if true - granted token can't be transferred
     */
    function grantRoleTransferable(
        address account,
        uint8 roleId,
        bool isNonTransferable
    ) external onlyOwner {
        if (isNonTransferable)
            _changeTokenTransferability(
                TokenTransferability(
                    grantRole(account, roleId),
                    isNonTransferable
                )
            );
    }

    /**
     * @notice Change role `roleId` name to `roleName`.
     */
    function renameRole(
        uint8 roleId,
        string calldata roleName
    ) external onlyOwner {
        bytes32 _role = _roleNameToBytes(roleName);
        roles[roleId] = _role;
        emit RoleRenamed(_role, roleId);
    }

    /**
     * @notice Unbind role from contract-function.
     * @notice See {IAccess-RoleData}.
     */
    function unbindRole(RoleData calldata roleData) external onlyOwner {
        bytes32 funcId = getFunctionId(roleData.target, roleData.selector);
        uint256 oldRole = functionRoles[funcId];
        uint256 newRole = oldRole & ~(1 << roleData.roleId);

        if (oldRole == newRole) return;

        functionRoles[funcId] = newRole;
        emit RoleUnbound(funcId, roleData.roleId);
    }

    /**
     * @dev Burns `tokenId`. See {ERC721-_burn}.
     * - The caller must own `tokenId` or be an approved operator or access owner.
     */
    function burn(uint256 tokenId) public virtual {
        address owner_ = owner();
        if (
           !(owner_ == _msgSender()) &&
            !_isAuthorized(owner_, _msgSender(), tokenId)
        ) revert NotTokenOwner();
        _burn(tokenId);
        _afterTokenTransfer(owner_, address(0), tokenId);
    }

    /**
     * @notice Throw if `account` have no access to function with selector `selector` of contract `target`.
     */
    function checkAccess(
        address account,
        address target,
        bytes4 selector
    ) external view override {
        if (
            (functionRoles[getFunctionId(target, selector)] &
                userRoles[account]) == 0
        ) revert AccessNotGranted();
    }

    /**
     * @notice Check if account `account` have role `roleId`.
     */
    function roleGranted(
        address account,
        uint8 roleId
    ) public view returns (bool) {
        uint256 roleBit = 1 << roleId;
        return userRoles[account] & roleBit == roleBit;
    }

    /**
     * @notice Get ID of function with selector `selector` of contract `target`.
     */
    function getFunctionId(
        address target,
        bytes4 selector
    ) public pure returns (bytes32) {
        return bytes32(abi.encodePacked(target)) | (bytes32(selector) >> 224);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        string[286] memory parts;
        parts[0] = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.head { fill: yellow; font-family: "Inter var", sans-serif; font-size: 12px; } .base { fill: white; font-family: "Inter var", sans-serif; font-size: 10px; }</style><rect width="100%" height="100%" fill="black" /><text x="10" y="20" class="head">Access token # ',
                tokenId.toString()
            )
        );
        uint8 roleId = tokenRoles[tokenId];
        parts[1] = string(
            abi.encodePacked(
                '</text><text x="10" y="30" class="base"> Role id: ',
                roleId.toString()
            )
        );
        parts[2] = string(
            abi.encodePacked(
                '</text><text x="10" y="40" class="base"> Role name: ',
                _bytes32ToString(roles[roleId])
            )
        );
        parts[
            3
        ] = '</text><text x="10" y="60" class="base"> Summarized account roles </text>';

        address account = ownerOf(tokenId);
        uint256 r;

        for (uint256 i = 0; i < 256; ++i) {
            if (roleGranted(account, uint8(i))) {
                parts[4 + i] = string(
                    abi.encodePacked(
                        '<text x="10" y="',
                        (70 + 10 * i).toString(),
                        '" class="base"> id: ',
                        r.toString(),
                        " name: ",
                        _bytes32ToString(roles[r]),
                        "</text>"
                    )
                );
            }
            r++;
        }

        string memory output;
        for (uint256 i = 0; i < parts.length; i++) {
            output = string(abi.encodePacked(output, parts[i]));
        }

        output = string(abi.encodePacked(output, "</svg>"));

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Access token #',
                        tokenId.toString(),
                        '", "description": "Realize role based function access. Easy to transfer. Easy to use. Enjoy.", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '"}'
                    )
                )
            )
        );
        output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );
        return output;
    }

    /**
     * @dev Hook that is called after any (single) transfer of tokens. This includes minting and burning.
     * See {ERC721BurnableUpgradeable-_afterTokenTransfer}.
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId
    ) internal {
        uint8 roleId = tokenRoles[firstTokenId];
        // not burn
        if (to != address(0)) {
            if (tokenNonTransferable[firstTokenId])
                revert TokenNonTransferable();
            if (roleGranted(to, roleId)) revert RoleAlreadyGranted();
            _grantRole(to, roleId);
        }
        // not mint
        if (from != address(0)) _revokeRole(from, roleId);
    }

    /**
     * @notice Bind role with contract-function.
     * @param  role see {IAccess.RoleData}
     */
    function _bindRole(RoleData calldata role) internal {
        bytes32 funcId = getFunctionId(role.target, role.selector);
        uint256 oldRole = functionRoles[funcId];
        uint256 newRole = oldRole | (1 << role.roleId);

        if (oldRole == newRole) return;

        functionRoles[funcId] = newRole;
        emit RoleBound(funcId, role.roleId);
    }

    function _bytes32ToString(
        bytes32 _bytes32
    ) public pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; ++i) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    function _changeTokenTransferability(
        TokenTransferability memory tokens
    ) internal {
        if (tokenNonTransferable[tokens.tokenId] == tokens.isNonTransferable)
            revert NoChanges();
        tokenNonTransferable[tokens.tokenId] = tokens.isNonTransferable;
        emit TokenTransferabilityChanged(
            tokens.tokenId,
            tokens.isNonTransferable
        );
    }

    /**
     * @notice Grant role `roleId` to `account`.
     */
    function _grantRole(address account, uint8 roleId) internal {
        userRoles[account] = userRoles[account] | (1 << roleId);
        emit RoleGranted(account, roleId);
    }

    /**
     * @notice Revoke a role `roleId` from account `account`.
     */
    function _revokeRole(address account, uint8 roleId) internal {
        userRoles[account] = userRoles[account] & ~(1 << roleId);
        emit RoleRevoked(account, roleId);
    }

    /**
     * @notice Convert string `roleName` to bytes32.
     */
    function _roleNameToBytes(
        string calldata roleName
    ) internal pure returns (bytes32) {
        if (bytes(roleName).length > 32) revert TooBigRoleName();
        return bytes32(bytes(roleName));
    }
}
