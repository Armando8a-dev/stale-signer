// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/IERC6093.sol";
import {BlockchainAcceleratorCertificate} from "../src/BlockchainAcceleratorCertificate.sol";

contract BlockchainAcceleratorCertificateTest is Test {
    BlockchainAcceleratorCertificate cert;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        cert = new BlockchainAcceleratorCertificate();
    }

    function test_MintBAC_IssuesTokenOne() public {
        vm.prank(alice);
        cert.mintBAC();

        assertEq(cert.ownerOf(1), alice);
        assertEq(cert.certificateOf(alice), 1);
        assertEq(cert.balanceOf(alice), 1);
    }

    function test_MintBAC_EmitsCertified() public {
        vm.expectEmit(true, true, false, false);
        emit BlockchainAcceleratorCertificate.Certified(alice, 1);

        vm.prank(alice);
        cert.mintBAC();
    }

    function test_MintBAC_TokenIdsIncrementAcrossHolders() public {
        vm.prank(alice);
        cert.mintBAC();

        vm.prank(bob);
        cert.mintBAC();

        assertEq(cert.certificateOf(alice), 1);
        assertEq(cert.certificateOf(bob), 2);
    }

    function test_SecondMint_Reverts() public {
        vm.startPrank(alice);
        cert.mintBAC();

        vm.expectRevert(
            abi.encodeWithSelector(BlockchainAcceleratorCertificate.AlreadyCertified.selector, alice, 1)
        );
        cert.mintBAC();
        vm.stopPrank();
    }

    function test_Certificate_CannotBeTransferred() public {
        vm.prank(alice);
        cert.mintBAC();

        vm.prank(alice);
        vm.expectRevert(BlockchainAcceleratorCertificate.CertificateNotTransferable.selector);
        cert.transferFrom(alice, bob, 1);
    }

    function test_OwnerOf_UnmintedToken_Reverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 1)
        );
        cert.ownerOf(1);
    }

    function testFuzz_EachWallet_MintsAtMostOnce(address who) public {
        vm.assume(who != address(0));

        vm.prank(who);
        cert.mintBAC();
        assertEq(cert.balanceOf(who), 1);

        vm.prank(who);
        vm.expectRevert();
        cert.mintBAC();
        assertEq(cert.balanceOf(who), 1);
    }
}
