// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {GroupTreasuryFactory} from "../src/GroupTreasuryFactory.sol";


contract DeployTreasuryFactory is Script {
    function run() external {
        vm.startBroadcast();
        GroupTreasuryFactory factory = new GroupTreasuryFactory();
        console.log("GroupTreasuryFactory deployed at:", address(factory));
        vm.stopBroadcast();
    }
}
