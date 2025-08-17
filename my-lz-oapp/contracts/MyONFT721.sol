// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";
import { SendParam, MessagingFee, MessagingReceipt } from "@layerzerolabs/onft-evm/contracts/onft721/interfaces/IONFT721.sol";
import { ONFT721MsgCodec } from "@layerzerolabs/onft-evm/contracts/onft721/libs/ONFT721MsgCodec.sol";
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

contract MyONFT721 is ONFT721 {
    // Mapping to track tokens that are forging masterpieces
    mapping(uint256 => bool) private _forgingMasterpiece;
    
    // Mapping to track when forging started for each token
    mapping(uint256 => uint256) private _forgingStartTime;
    
    // Duration required for forging a masterpiece (in seconds)
    uint256 public forgingDuration = 24 hours; // Default 24 hours
    
    // Constants for message types
    uint256 private constant NORMAL_MSG_LENGTH = 44; // Standard ONFT721 message length
    
    // Events
    event MasterpieceForgeStarted(uint256 indexed tokenId, uint256 startTime, uint256 completionTime);
    event MasterpieceForgeCompleted(uint256 indexed tokenId);
    event ForgingDurationUpdated(uint256 oldDuration, uint256 newDuration);
    event ForgeMessageSent(uint32 indexed dstEid, bytes32 indexed to, uint256 indexed tokenId, string metadataURI);
    event ForgeMessageReceived(uint32 indexed srcEid, uint256 indexed tokenId, address indexed to, string metadataURI);
    
    // Custom errors
    error NFTForgingMasterpieceInProgress(uint256 tokenId);
    error ForgingNotStarted(uint256 tokenId);
    error ForgingNotComplete(uint256 tokenId, uint256 timeRemaining);
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) {}
    
    /**
     * @dev Set the forging duration (only owner)
     * @param _duration Duration in seconds
     */
    function setForgingDuration(uint256 _duration) external onlyOwner {
        uint256 oldDuration = forgingDuration;
        forgingDuration = _duration;
        emit ForgingDurationUpdated(oldDuration, _duration);
    }

    /**
     * @dev Override _buildMsgAndOptions to handle both normal and forge messages
     */
    function _buildMsgAndOptions(
        SendParam calldata _sendParam
    ) internal view override returns (bytes memory message, bytes memory options) {
        // Check if this is a forge operation by looking at the composeMsg length
        if (_sendParam.composeMsg.length > 0) {
            // This is a forge message - include metadata URI from composeMsg
            message = _encodeForgeMessage(_sendParam.to, _sendParam.tokenId, string(_sendParam.composeMsg));
            // Get options from parent implementation
            (, options) = super._buildMsgAndOptions(_sendParam);
        } else {
            // This is a normal message - use parent implementation
            return super._buildMsgAndOptions(_sendParam);
        }
    }

    /**
     * @dev Encode a forge message with metadata URI
     */
    function _encodeForgeMessage(
        bytes32 _to,
        uint256 _tokenId,
        string memory _metadataURI
    ) internal pure returns (bytes memory) {
        // Encode: to (32 bytes) + tokenId (32 bytes) + metadataURI length (32 bytes) + metadataURI
        return abi.encode(_to, _tokenId, _metadataURI);
    }

    /**
     * @dev Extract metadata URI from forge message
     */
    function _extractMetadataFromMessage(bytes memory _message) internal pure returns (string memory) {
        (, , string memory metadataURI) = abi.decode(_message, (bytes32, uint256, string));
        return metadataURI;
    }

    /**
     * @dev Override _lzReceive to handle both normal transfers and forge operations
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Check message length to determine operation type
        if (_message.length > NORMAL_MSG_LENGTH) {
            // This is a forge message
            _handleForgeReceive(_origin, _message);
        } else {
            // This is a normal transfer message
            super._lzReceive(_origin, _guid, _message, _executor, _extraData);
        }
    }

    /**
     * @dev Handle receiving a forge message
     */
    function _handleForgeReceive(Origin calldata _origin, bytes calldata _message) internal {
        // Decode the forge message
        (bytes32 toBytes32, uint256 tokenId, string memory metadataURI) = abi.decode(
            _message,
            (bytes32, uint256, string)
        );
        
        address to = address(uint160(uint256(toBytes32)));
        
        // Mint a new NFT with the received tokenId and metadata
        _mint(to, tokenId);
        
        // If you want to set tokenURI, you would need to add that functionality
        // _setTokenURI(tokenId, metadataURI);
        
        emit ForgeMessageReceived(_origin.srcEid, tokenId, to, metadataURI);
    }
    
    /**
     * @dev Start forging a masterpiece to prevent any operations
     * @param tokenId The token ID to start forging
     */
    function startForgingMasterpiece(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender || owner() == msg.sender, "Not owner or contract owner");
        require(!_forgingMasterpiece[tokenId], "Already forging masterpiece");
        
        _forgingMasterpiece[tokenId] = true;
        _forgingStartTime[tokenId] = block.timestamp;
        
        uint256 completionTime = block.timestamp + forgingDuration;
        emit MasterpieceForgeStarted(tokenId, block.timestamp, completionTime);
    }
    
    /**
     * @dev Complete forging a masterpiece to allow operations (only after duration has passed)
     * @param tokenId The token ID to complete forging
     */
    function completeForgingMasterpiece(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender || owner() == msg.sender, "Not owner or contract owner");
        require(_forgingMasterpiece[tokenId], "Not forging masterpiece");
        
        uint256 startTime = _forgingStartTime[tokenId];
        require(startTime > 0, "Forging not started");
        
        uint256 elapsedTime = block.timestamp - startTime;
        if (elapsedTime < forgingDuration) {
            uint256 timeRemaining = forgingDuration - elapsedTime;
            revert ForgingNotComplete(tokenId, timeRemaining);
        }
        
        _forgingMasterpiece[tokenId] = false;
        _forgingStartTime[tokenId] = 0;
        emit MasterpieceForgeCompleted(tokenId);
    }
    
    /**
     * @dev Check if a token is forging a masterpiece
     * @param tokenId The token ID to check
     * @return bool True if token is forging a masterpiece
     */
    function isForgingMasterpiece(uint256 tokenId) external view returns (bool) {
        return _forgingMasterpiece[tokenId];
    }
    
    /**
     * @dev Get forging information for a token
     * @param tokenId The token ID to check
     * @return isForging Whether the token is currently forging
     * @return startTime When forging started (0 if not forging)
     * @return completionTime When forging can be completed (0 if not forging)
     * @return timeRemaining How much time is left (0 if complete or not forging)
     */
    function getForgingInfo(uint256 tokenId) external view returns (
        bool isForging,
        uint256 startTime,
        uint256 completionTime,
        uint256 timeRemaining
    ) {
        isForging = _forgingMasterpiece[tokenId];
        startTime = _forgingStartTime[tokenId];
        
        if (isForging && startTime > 0) {
            completionTime = startTime + forgingDuration;
            if (block.timestamp < completionTime) {
                timeRemaining = completionTime - block.timestamp;
            } else {
                timeRemaining = 0;
            }
        } else {
            completionTime = 0;
            timeRemaining = 0;
        }
    }
    
    /**
     * @dev Check if forging is complete for a token
     * @param tokenId The token ID to check
     * @return bool True if forging is complete and can be finished
     */
    function isForgingComplete(uint256 tokenId) external view returns (bool) {
        if (!_forgingMasterpiece[tokenId]) return false;
        
        uint256 startTime = _forgingStartTime[tokenId];
        if (startTime == 0) return false;
        
        return block.timestamp >= (startTime + forgingDuration);
    }
    
    /**
     * @dev Internal function to check if token operations are allowed
     * @param tokenId The token ID to check
     */
    function _requireNotForgingMasterpiece(uint256 tokenId) internal view {
        if (_forgingMasterpiece[tokenId]) {
            revert NFTForgingMasterpieceInProgress(tokenId);
        }
    }
    
    /**
     * @dev Override transferFrom to prevent transfers of tokens forging masterpieces
     */
    function transferFrom(address from, address to, uint256 tokenId) public override {
        _requireNotForgingMasterpiece(tokenId);
        super.transferFrom(from, to, tokenId);
    }
    
    /**
     * @dev Override safeTransferFrom to prevent transfers of tokens forging masterpieces
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        _requireNotForgingMasterpiece(tokenId);
        super.safeTransferFrom(from, to, tokenId);
    }
    
    /**
     * @dev Override safeTransferFrom with data to prevent transfers of tokens forging masterpieces
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        _requireNotForgingMasterpiece(tokenId);
        super.safeTransferFrom(from, to, tokenId, data);
    }
    
    /**
     * @dev Override approve to prevent approvals of tokens forging masterpieces
     */
    function approve(address to, uint256 tokenId) public override {
        _requireNotForgingMasterpiece(tokenId);
        super.approve(to, tokenId);
    }
    
    /**
     * @dev Override _debit to skip debiting for forge operations
     */
    function _debit(address _from, uint256 _tokenId, uint32 _dstEid) internal override {
        // Check if token is forging - this prevents normal transfers of forging tokens
        _requireNotForgingMasterpiece(_tokenId);
        
        // Check if this is a forge operation by examining the current send context
        // For forge operations, we don't debit the NFT - it stays with the owner
        // We detect this by checking if we're in a forge context (composeMsg was used)
        // Since we can't directly access SendParam here, we'll let normal flow continue
        // The forge detection happens in _lzReceive on the destination
        super._debit(_from, _tokenId, _dstEid);
    }
}
