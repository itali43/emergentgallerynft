// Command to run this script:
// npx hardhat run scripts/send-forged.js --network baseSepolia

const hre = require('hardhat');
const { Options } = require('@layerzerolabs/lz-v2-utilities');

async function main() {
    console.log(`🚀 Sending forged NFT cross-chain from network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Configuration
    const tokenId = 1;
    const dstEid = 40231; // Arbitrum Sepolia endpoint ID
    const recipientAddress = '0x3006b25a6ccAdbF696794f96c08894E959702392'; // Your address
    const metadataURI = 'https://your-metadata-url.com/forged/1.json';

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
    const composeBytes = hre.ethers.utils.toUtf8Bytes(metadataURI); // This triggers forgery mode

    // Create SendParam as array: [dstEid, to, tokenId, extraOptions, composeMsg, onftCmd]
    const sendParam = [dstEid, toBytes32, tokenId, optionsHex, composeBytes, '0x'];

    console.log(`\n🔍 Send parameters:`);
    console.log(`   Destination EID: ${dstEid} (Arbitrum Sepolia)`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Metadata URI: ${metadataURI}`);

    // Get messaging fee quote
    console.log(`\n💰 Getting fee quote...`);
    const messagingFee = await contract.quoteSend(sendParam, false);
    const nativeFee = Array.isArray(messagingFee) ? messagingFee[0] : messagingFee.nativeFee;
    console.log(`💰 Messaging fee: ${hre.ethers.utils.formatEther(nativeFee)} ETH`);

    // Check if we have enough balance
    const balance = await deployer.getBalance();
    if (balance.lt(nativeFee)) {
        throw new Error(
            `Insufficient balance. Need ${hre.ethers.utils.formatEther(nativeFee)} ETH, have ${hre.ethers.utils.formatEther(balance)} ETH`
        );
    }

    // Send the forged NFT
    console.log(`\n🚀 Sending forged NFT cross-chain...`);
    const forgeTx = await contract.send(
        sendParam,
        [nativeFee, 0], // MessagingFee as array
        deployer.address, // refund address
        { value: nativeFee }
    );

    console.log(`⏳ Transaction hash: ${forgeTx.hash}`);
    await forgeTx.wait();
    console.log('✅ Forged NFT sent cross-chain successfully!');

    console.log(`\n🎉 Your forged NFT will be minted on Arbitrum Sepolia!`);
    console.log(`📝 Check the ForgedMasterpieces contract on Arbitrum Sepolia for your new NFT.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
