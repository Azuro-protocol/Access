// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IAccess {
    function checkAccess(
        address sender,
        address _contract,
        bytes4 selector
    ) external;
}
