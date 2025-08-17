// Command to run this script:
// npx hardhat run scripts/forgerough.js --network baseSepolia

const hre = require('hardhat');

async function main() {
    console.log(`🔥 Starting forge process on network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Start forging masterpiece for token ID 1
    const startTx = await contract.startForgingMasterpiece(1);
    await startTx.wait();
    console.log('🔥 Started forging masterpiece for token #1');

    // Check forging info
    const forgingInfo = await contract.getForgingInfo(1);
    console.log(`⏰ Forging started at: ${new Date(forgingInfo.startTime * 1000)}`);
    console.log(`⌛ Completion time: ${new Date(forgingInfo.completionTime * 1000)}`);
    console.log(`⏳ Time remaining: ${forgingInfo.timeRemaining} seconds`);

    // Wait 5 seconds before checking if forge is ready
    console.log(`\n⏱️  Waiting 5 seconds before checking forge status...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if forging is complete
    const isComplete = await contract.isForgingComplete(1);
    console.log(`✅ Forging complete: ${isComplete}`);

    if (isComplete) {
        const completeTx = await contract.completeForgingMasterpiece(1);
        await completeTx.wait();
        console.log('🎉 Completed forging masterpiece for token #1');

        // Example: Send forged NFT from Base Sepolia to Arbitrum Sepolia
        console.log('\n🚀 Sending forged NFT cross-chain...');
        const dstEid = 40231; // Arbitrum Sepolia endpoint ID
        const recipientAddress = '0x3006b25a6ccAdbF696794f96c08894E959702392'; // Your address
        const metadataURI = 'https://your-metadata-url.com/forged/1.json';

        // Convert address to bytes32
        const toBytes32 = hre.ethers.utils.hexZeroPad(recipientAddress, 32);

        // Build options for gas (using proper even-length hex)
        const optionsHex = '0x0003010011010000000000000000000000000030d400'; // Fixed: even length
        const composeBytes = hre.ethers.utils.toUtf8Bytes(metadataURI); // This triggers forgery mode

        // Create SendParam as array: [dstEid, to, tokenId, extraOptions, composeMsg, onftCmd]
        const sendParam = [dstEid, toBytes32, 1, optionsHex, composeBytes, '0x'];

        // Get messaging fee quote
        const messagingFee = await contract.quoteSend(sendParam, false);
        const nativeFee = Array.isArray(messagingFee) ? messagingFee[0] : messagingFee.nativeFee;
        console.log(`💰 Messaging fee: ${hre.ethers.utils.formatEther(nativeFee)} ETH`);

        // Send the forged NFT
        const forgeTx = await contract.send(
            sendParam,
            [nativeFee, 0], // MessagingFee as array
            deployer.address, // refund address
            { value: nativeFee }
        );

        await forgeTx.wait();
        console.log('🚀 Forged NFT sent cross-chain!');
    } else {
        const forgingInfo = await contract.getForgingInfo(1);
        console.log(`⏳ Still need to wait ${forgingInfo.timeRemaining} seconds`);
        console.log('❌ Skipping cross-chain send since forging is not complete');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
