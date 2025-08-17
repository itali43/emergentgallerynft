// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ForgedMasterpieces is ERC721URIStorage, Ownable {
    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC721(name_, symbol_)
        Ownable(initialOwner)
    {}

    function mintWithURI(address to, uint256 tokenId, string calldata tokenURI_) external onlyOwner {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
    }
} 