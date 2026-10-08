// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BlockchainAcceleratorCertificate} from "../src/BlockchainAcceleratorCertificate.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        BlockchainAcceleratorCertificate cert = new BlockchainAcceleratorCertificate();
        vm.stopBroadcast();

        console.log("BlockchainAcceleratorCertificate:", address(cert));
    }
}
