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
    uint256 private constant NORMAL_MSG_LENGTH = 64; // 32 bytes sendTo + 32 bytes tokenId
    
    // Events
    event MasterpieceForgeStarted(uint256 indexed tokenId, uint256 startTime, uint256 completionTime);
    event MasterpieceForgeCompleted(uint256 indexed tokenId);
    event ForgingDurationUpdated(uint256 oldDuration, uint256 newDuration);
    event ForgeMessageSent(uint32 indexed dstEid, bytes32 indexed to, uint256 indexed tokenId, string metadataURI);
    event ForgeMessageReceived(uint32 indexed srcEid, uint256 indexed tokenId, address indexed to, string metadataURI);
    event MessageLengthDebug(uint256 messageLength, bool isForge);
    
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
    
    function setForgingDuration(uint256 _duration) external onlyOwner {
        uint256 oldDuration = forgingDuration;
        forgingDuration = _duration;
        emit ForgingDurationUpdated(oldDuration, _duration);
    }

    // Use parent implementation of _buildMsgAndOptions for full compatibility
    function _buildMsgAndOptions(
        SendParam calldata _sendParam
    ) internal view override returns (bytes memory message, bytes memory options) {
        return super._buildMsgAndOptions(_sendParam);
    }

    // Do not change receive behaviour; let parent credit/mint and handle compose
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        emit MessageLengthDebug(_message.length, _message.length > NORMAL_MSG_LENGTH);
        super._lzReceive(_origin, _guid, _message, _executor, _extraData);
    }

    // Dual-purpose send: skip debit when message length indicates composed payload (>64 bytes)
    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) public payable override returns (MessagingReceipt memory msgReceipt) {
        (bytes memory message, bytes memory options) = super._buildMsgAndOptions(_sendParam);
        bool isForge = message.length > NORMAL_MSG_LENGTH;
        emit MessageLengthDebug(message.length, isForge);

        // Always require ownership
        require(_ownerOf(_sendParam.tokenId) == msg.sender, "ONFT721: send caller is not owner nor approved");

        if (isForge) {
            // Forge: do not debit; send message so destination mints while source keeps token
            msgReceipt = _lzSend(_sendParam.dstEid, message, options, _fee, _refundAddress);
            emit ForgeMessageSent(_sendParam.dstEid, _sendParam.to, _sendParam.tokenId, string(_sendParam.composeMsg));
        } else {
            // Normal: burn on source, mint on destination (parent semantics)
            _debit(msg.sender, _sendParam.tokenId, _sendParam.dstEid);
            msgReceipt = _lzSend(_sendParam.dstEid, message, options, _fee, _refundAddress);
        }
        return msgReceipt;
    }

    // Forging state/time logic
    function startForgingMasterpiece(uint256 tokenId) external {
        require(_ownerOf(tokenId) == msg.sender || owner() == msg.sender, "Not owner or contract owner");
        require(!_forgingMasterpiece[tokenId], "Already forging masterpiece");
        _forgingMasterpiece[tokenId] = true;
        _forgingStartTime[tokenId] = block.timestamp;
        uint256 completionTime = block.timestamp + forgingDuration;
        emit MasterpieceForgeStarted(tokenId, block.timestamp, completionTime);
    }

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

    function isForgingMasterpiece(uint256 tokenId) external view returns (bool) {
        return _forgingMasterpiece[tokenId];
    }

    function getForgingInfo(uint256 tokenId)
        external
        view
        returns (
            bool isForging,
            uint256 startTime,
            uint256 completionTime,
            uint256 timeRemaining
        )
    {
        isForging = _forgingMasterpiece[tokenId];
        startTime = _forgingStartTime[tokenId];
        if (isForging && startTime > 0) {
            completionTime = startTime + forgingDuration;
            timeRemaining = block.timestamp < completionTime ? (completionTime - block.timestamp) : 0;
        }
    }

    function isForgingComplete(uint256 tokenId) external view returns (bool) {
        if (!_forgingMasterpiece[tokenId]) return false;
        uint256 startTime = _forgingStartTime[tokenId];
        if (startTime == 0) return false;
        return block.timestamp >= (startTime + forgingDuration);
    }

    function _requireNotForgingMasterpiece(uint256 tokenId) internal view {
        if (_forgingMasterpiece[tokenId]) {
            revert NFTForgingMasterpieceInProgress(tokenId);
        }
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        _requireNotForgingMasterpiece(tokenId);
        super.transferFrom(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) public override {
        _requireNotForgingMasterpiece(tokenId);
        super.approve(to, tokenId);
    }

    function _debit(address _from, uint256 _tokenId, uint32 _dstEid) internal override {
        _requireNotForgingMasterpiece(_tokenId);
        super._debit(_from, _tokenId, _dstEid);
    }
}
