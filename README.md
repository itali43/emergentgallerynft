## Emergent Gallery NFT Contracts

A compact smart contract suite for Emergent Gallery that mints and moves NFTs across chains, and supports a creative “forging masterpiece” flow. Contracts are written in Solidity and built with Hardhat. Cross-chain functionality is powered by LayerZero v2 ONFT-721.

### What this project does

- Cross-chain ERC‑721 via LayerZero ONFT-721 (v2)
- Normal send: burns on source, mints on destination
- Forge send: uses composed payload to mint on destination without burning the source (creative duplication flow)
- Time-based “forging masterpiece” state that temporarily blocks transfers/approvals until forging completes

### Technologies

- Solidity 0.8.22
- Hardhat + hardhat-deploy + ethers
- LayerZero v2 ONFT-721 (messaging via `ONFT721Core` and `ONFT721MsgCodec`)
- TypeScript tests (Hardhat)

LayerZero is used to:

- Encode ONFT-721 messages for cross-chain sends (`_buildMsgAndOptions`)
- Send messages via the endpoint (`_lzSend`) and receive on the destination (`_lzReceive`)
- Detect composed payloads (message length > 64 bytes) to trigger the “forge” path

### Networks (testnets)

- Arbitrum Sepolia
- Base Sepolia
- Flow Testnet

These are configured in `my-lz-oapp/hardhat.config.ts` and used by `layerzero.config.ts`.

### Quick start

```bash
# Install dependencies
npm install  # or pnpm install / yarn install

# Compile
npx hardhat compile

# Run tests
npx hardhat test test/hardhat/MyONFT721.test.ts
```

### Deploy (example)

```bash
# Set your RPCs and keys in .env first
# Then deploy to a testnet
npx hardhat deploy --network arbitrumSepolia
```

### Key contracts

- `my-lz-oapp/contracts/MyONFT721.sol`: ONFT-721 with dual-purpose send (normal vs “forge”) and time-based forging lock
- `my-lz-oapp/contracts/MyONFT721Adapter.sol`: Adapter variant (if using an existing ERC-721)

### Notes

- This repository is for testing and demonstration. Review and audit before mainnet use.
- Environment variables (`MNEMONIC` or `PRIVATE_KEY`, RPC URLs) are required for real network deployments.
