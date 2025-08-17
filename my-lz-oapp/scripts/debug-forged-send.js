// Command to run this script:
// npx hardhat run scripts/debug-forged-send.js --network baseSepolia

const hre = require('hardhat');
const { Options } = require('@layerzerolabs/lz-v2-utilities');

async function main() {
    console.log(`🐛 Debug forged NFT send on network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Configuration
    const tokenId = 2; // Using token 2 which we just minted
    const dstEid = 40231; // Arbitrum Sepolia endpoint ID (back to Arbitrum)
    const recipientAddress = '0x3006b25a6ccAdbF696794f96c08894E959702392';

    // Use a MUCH shorter metadata URI to reduce message size
    const metadataURI = 'ipfs://test123'; // Much shorter than before

    console.log(`\n🔍 Debug configuration:`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Destination: Arbitrum Sepolia (${dstEid})`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Metadata URI: ${metadataURI} (${metadataURI.length} chars)`);

    // Check token ownership and forging status
    try {
        const owner = await contract.ownerOf(tokenId);
        console.log(`👤 Token #${tokenId} owner: ${owner}`);

        const forgingInfo = await contract.getForgingInfo(tokenId);
        console.log(
            `🔥 Forging status: isForging=${forgingInfo.isForging}, complete=${await contract.isForgingComplete(tokenId)}`
        );

        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            throw new Error(`You don't own token #${tokenId}`);
        }
    } catch (error) {
        console.log(`❌ Token #${tokenId} issue:`, error.message);
        return;
    }

    // Check forged collection is set for destination
    const forgedCollection = await contract.forgedCollectionByEid(dstEid);
    console.log(`🎨 Forged collection for EID ${dstEid}: ${forgedCollection}`);

    if (forgedCollection === '0x0000000000000000000000000000000000000000') {
        console.log(`❌ No forged collection set for destination EID ${dstEid}`);
        return;
    }

    // Build options and parameters
    const optionsHex = Options.newOptions().addExecutorLzReceiveOption(300000, 0).toHex().toString(); // Increased gas
    const toBytes32 = hre.ethers.utils.zeroPad(recipientAddress, 32);
    const composeBytes = hre.ethers.utils.toUtf8Bytes(metadataURI); // Short metadata

    console.log(`\n🔧 Message details:`);
    console.log(`   Options: ${optionsHex}`);
    console.log(`   Compose bytes length: ${composeBytes.length}`);
    console.log(`   Compose bytes: ${hre.ethers.utils.hexlify(composeBytes)}`);

    // Create SendParam as array
    const sendParam = [dstEid, toBytes32, tokenId, optionsHex, composeBytes, '0x'];

    // Test fee quote first
    console.log(`\n💰 Testing fee quote...`);
    try {
        const messagingFee = await contract.quoteSend(sendParam, false);
        const nativeFee = Array.isArray(messagingFee) ? messagingFee[0] : messagingFee.nativeFee;
        console.log(`✅ Fee quote successful: ${hre.ethers.utils.formatEther(nativeFee)} ETH`);

        // Try the actual send with manual gas limit
        console.log(`\n🚀 Attempting forged send with manual gas limit...`);

        const tx = await contract.send(sendParam, [nativeFee, 0], deployer.address, {
            value: nativeFee,
            gasLimit: 500000, // Manual gas limit
        });

        console.log(`⏳ Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log('✅ Forged NFT sent successfully!');
    } catch (error) {
        console.error(`❌ Error:`, error.message);

        if (error.message.includes('execution reverted')) {
            console.log(`\n🔍 Debugging execution revert:`);
            console.log(`   - Check if forging is complete`);
            console.log(`   - Check if ForgedMasterpieces contract can mint`);
            console.log(`   - Check if metadata URI is valid`);
            console.log(`   - Try with even shorter metadata URI`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
