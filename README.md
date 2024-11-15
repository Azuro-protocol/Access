# Access project

This project demonstrates access token approach for control call rights different contract-functions.

## General concept
Main goal of the project is to provide easy common call access control over different contracts-functions for one project or many projects for any users. 
```shell
contract1-{func1, func2 ... funcX} ------->    \
contract2-{func1, func2 ... funcY} ------->     \   --> Access.sol
...                                             / 
contractY-{func1, func2 ... funcZ} ------->    /
```
Access grant realized by owning ERC721 token. Every token is one access role. 
```shell
+------+         --------------------
|NFT_01|  -->  / Role of Some Action /
+------+        --------------------

+------+         -----------------------
|NFT_02|  -->  / Role of Another Action /
+------+        -----------------------
```
User can owns some different token roles at once and get access for role allowed function. 
```shell
                 +------+
                 |NFT_01|
                 +------+
   O          /       +------+      ---------------         || contrac1.func1 ||
  -|-    -->  -----   |NFT_02| -- / Role of Action /  --->  || contrac1.func2 ||
  / \         \       +------+     ---------------          || contrac2.func1 ||
 Alice           +------+
                 |NFT_03|
                 +------+
```
Contract-function can be bound with different roles at once.
```shell
                               --------------------
                             / Role of Some Action /
                          /   --------------------
|| contrac1.func2 ||  --> 
                          \
                               -----------------------
                             / Role of Another Action /
                              -----------------------
```
Every role represented by bit in 256 bits (32 bytes) access vector. There are 256 roles at access smart contract.
Access is granted by matching user access role bits and bound function role bits
```shell
          O            Role Action1 [NFT_01]
         -|-           |                      Role Action2 [NFT_02]
         / \           |                      |
        Alice         [1 0 0 ................ 1]
                       |
                    <match>
                       |
|| contrac1.func2 ||  [1 0 0 ................ 0]
                       |
                         --------------------
                       / Role of Some Action /
                        --------------------

```
## Access common cases and functions
#### 1. Controled contract 
```solidity
import "./interface/IAccess.sol";
...
// access modifier
modifier onlyAccess(bytes4 selector) {
    access.checkAccess(msg.sender, address(this), selector);
    _;
}
...
// use access modifier with function selector parameter
function func1(uint256 someValue)
    external 
    onlyAccess(this.func1.selector) 
{
    //some code
}
```

#### 2. Owner addes roles to *Access.sol*
```solidity
function addRole(string memory roleName)
```
<em>* roleName string stored as fixed length type bytes32, so use short names to fit 32 characters (UTF-8 strings)</em>
#### 3. Owner bind roles to *Access.sol*
```solidity
struct RoleData {
  address target;
  bytes4 selector;
  uint8 roleId;
}

function bindRole(RoleData calldata role) external onlyOwner
```
or for multiple roles
```solidity
function bindRoles(RoleData[] calldata RoleDatas) external onlyOwner
```
#### 4. Owner grants role (mint NFT) to user
```solidity
function grantRole(address user, uint8 roleId, false)
```
#### 4.1. Owner grants role (mint NFT) to user with non transferable access token
```solidity
function grantRole(address user, uint8 roleId, true)
```
#### 5. User can transfer NFT to other user, except non transferable tokens (see 4.1)
```solidity
// {IERC721-transferFrom}
function transferFrom(address from, address to, uint256 tokenId)
```
#### 6. User can call some contract with access provided by owning access token
```solidity
function burn(uint256 tokenId)
```
#### 7. User can burn NFT (losing role access)
```solidity
function burn(uint256 tokenId)
```
#### 8. Owner can revoke access by burning user's NFT token
```solidity
function burnToken(uint256 tokenId)
```
#### 9. Owner can change token's transfer ability
```solidity
function changeTokenTransferability(uint256 tokenId, bool isNonTransferable)
```
#### 9.1. Owner can change batch of token's transfer ability
```solidity
function changeBatchTokenTransferability(TokenTransferability[] calldata tokens)
```
## compile and test tasks:
```shell
npx hardhat compile
npx hardhat test
```

# Example of access tokens

Some access tokens with different granted roles

## Roles
Role id `0` - Role name `Role for some sensitive action` 
Role id `1` - Role name `Role for public action, is safe`
Role id `2` - Role name `Maintainer action role, settings`

## How it looks like
https://opensea.io/assets/matic/0x8a58b0547f8391ae7380bd25383d055fc85fd8e9