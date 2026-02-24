// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SettlementReceipt} from "../src/SettlementReceipt.sol";


contract DeployReceipt is Script {
    function run() external {
        vm.startBroadcast();
        SettlementReceipt receipt = new SettlementReceipt();
        vm.stopBroadcast();

        console.log("SettlementReceipt deployed at:", address(receipt));
        console.log("Add to .env:");
        console.log("NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS=", address(receipt));
    }
}
