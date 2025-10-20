// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SunsettingsPhoto - Simple ERC-721 that mints tokenURI-specified NFTs
contract SunsettingsPhoto is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor() ERC721("Sunsettings Photo", "SUNSET") Ownable(msg.sender) {}

    /// @notice Mint a new token to `to` with metadata at `tokenURI_` (e.g. ipfs://CID)
    function safeMint(address to, string memory tokenURI_) external returns (uint256) {
        _tokenIds += 1;
        uint256 newItemId = _tokenIds;
        _safeMint(to, newItemId);
        _setTokenURI(newItemId, tokenURI_);
        return newItemId;
    }
}
