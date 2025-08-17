// Command to run this script:
// npx hardhat run scripts/test-simple-send.js --network baseSepolia

const hre = require('hardhat');
const { Options } = require('@layerzerolabs/lz-v2-utilities');

async function main() {
    console.log(`🧪 Testing simple cross-chain send on network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Configuration for simple transfer (NOT forging)
    const tokenId = 1;
    const dstEid = 40231; // Arbitrum Sepolia endpoint ID
    const recipientAddress = '0x3006b25a6ccAdbF696794f96c08894E959702392'; // Your address

    // Check token ownership
    try {
        const owner = await contract.ownerOf(tokenId);
        console.log(`👤 Token #${tokenId} owner: ${owner}`);
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            throw new Error(`You don't own token #${tokenId}`);
        }
    } catch (error) {
        console.log(`❌ Token #${tokenId} does not exist or you don't own it`);
        return;
    }

    // Build proper options using LayerZero utilities
    const optionsHex = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const toBytes32 = hre.ethers.utils.zeroPad(recipientAddress, 32);
    const composeBytes = '0x'; // Empty - this makes it a NORMAL transfer, not forging

    // Create SendParam as array: [dstEid, to, tokenId, extraOptions, composeMsg, onftCmd]
    const sendParam = [dstEid, toBytes32, tokenId, optionsHex, composeBytes, '0x'];

    console.log(`\n🔍 Send parameters (NORMAL transfer):`);
    console.log(`   Destination EID: ${dstEid} (Arbitrum Sepolia)`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Compose message: ${composeBytes} (empty = normal transfer)`);

    // Get messaging fee quote
    console.log(`\n💰 Getting fee quote...`);
    try {
        const messagingFee = await contract.quoteSend(sendParam, false);
        const nativeFee = Array.isArray(messagingFee) ? messagingFee[0] : messagingFee.nativeFee;
        console.log(`💰 Messaging fee: ${hre.ethers.utils.formatEther(nativeFee)} ETH`);

        // Check if we have enough balance
        const balance = await deployer.getBalance();
        console.log(`💰 Your balance: ${hre.ethers.utils.formatEther(balance)} ETH`);

        if (balance.lt(nativeFee)) {
            throw new Error(
                `Insufficient balance. Need ${hre.ethers.utils.formatEther(nativeFee)} ETH, have ${hre.ethers.utils.formatEther(balance)} ETH`
            );
        }

        console.log(`\n✅ Fee quote successful! Ready to send.`);
        console.log(`💡 This would be a NORMAL cross-chain transfer (not forging).`);
        console.log(`💡 The NFT would move from Base Sepolia to Arbitrum Sepolia.`);
    } catch (error) {
        console.error(`❌ Error getting fee quote:`, error.message);

        // Check peer connection
        const peer = await contract.peers(dstEid);
        console.log(`🔗 Peer for EID ${dstEid}: ${peer}`);

        if (peer === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log(`❌ No peer set for destination EID ${dstEid}`);
            console.log(`💡 You need to set up peer connections first.`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
