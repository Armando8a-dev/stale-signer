// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title BlockchainAcceleratorCertificate
/// @notice The contract this demo mints against: `mintBAC()`, one certificate per
///         wallet, non-transferable. It is deliberately small — the lesson in this
///         block isn't the contract, it's what happens in the browser talking to it.
/// @dev    Implements the course's own `IBlockchainAcceleratorCertificate` interface
///         (`function mintBAC() external;`) from Block 22.
contract BlockchainAcceleratorCertificate is ERC721 {
    uint256 private _nextId = 1;
    mapping(address => uint256) public certificateOf;

    error AlreadyCertified(address holder, uint256 tokenId);
    error CertificateNotTransferable();

    event Certified(address indexed holder, uint256 indexed tokenId);

    constructor() ERC721("Blockchain Accelerator Certificate", "BAC") {}

    /// @notice Mints one certificate to the caller. Reverts on a second call —
    ///         the certificate is proof of completion, not a collectible.
    function mintBAC() external {
        if (certificateOf[msg.sender] != 0) {
            revert AlreadyCertified(msg.sender, certificateOf[msg.sender]);
        }

        uint256 tokenId = _nextId++;
        certificateOf[msg.sender] = tokenId;
        _mint(msg.sender, tokenId);

        emit Certified(msg.sender, tokenId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert CertificateNotTransferable();
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return "data:application/json;utf8,{\"name\":\"Blockchain Accelerator Certificate\",\"description\":\"Soulbound proof of completion.\"}";
    }
}
