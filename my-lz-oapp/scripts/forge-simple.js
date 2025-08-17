// Command to run this script:
// npx hardhat run scripts/forge-simple.js --network baseSepolia

const hre = require('hardhat');

async function main() {
    console.log(`🔥 Simple forge process on network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Check if token 1 exists and who owns it
    try {
        const owner = await contract.ownerOf(1);
        console.log(`👤 Token #1 owner: ${owner}`);
    } catch (error) {
        console.log(`❌ Token #1 does not exist yet`);
        return;
    }

    // Check current forging status
    const forgingInfo = await contract.getForgingInfo(1);
    console.log(`🔍 Current forging status:`);
    console.log(`   Is forging: ${forgingInfo.isForging}`);
    console.log(`   Start time: ${forgingInfo.startTime}`);
    console.log(`   Time remaining: ${forgingInfo.timeRemaining} seconds`);

    if (!forgingInfo.isForging) {
        // Start forging masterpiece for token ID 1
        console.log(`\n🔥 Starting forging for token #1...`);
        const startTx = await contract.startForgingMasterpiece(1);
        await startTx.wait();
        console.log('✅ Started forging masterpiece for token #1');

        // Check updated forging info
        const updatedInfo = await contract.getForgingInfo(1);
        console.log(`⏰ Forging started at: ${new Date(updatedInfo.startTime * 1000)}`);
        console.log(`⌛ Completion time: ${new Date(updatedInfo.completionTime * 1000)}`);
        console.log(`⏳ Time remaining: ${updatedInfo.timeRemaining} seconds`);
    }

    // Wait 5 seconds before checking if forge is ready
    console.log(`\n⏱️  Waiting 5 seconds before checking forge status...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if forging is complete
    const isComplete = await contract.isForgingComplete(1);
    console.log(`✅ Forging complete: ${isComplete}`);

    if (isComplete) {
        console.log(`\n🎉 Completing forging for token #1...`);
        const completeTx = await contract.completeForgingMasterpiece(1);
        await completeTx.wait();
        console.log('✅ Completed forging masterpiece for token #1');

        // Check final status
        const finalInfo = await contract.getForgingInfo(1);
        console.log(`🏁 Final forging status: ${finalInfo.isForging}`);

        console.log(`\n🎉 Forging process completed successfully! Token #1 is ready for cross-chain transfer.`);
    } else {
        const forgingInfo = await contract.getForgingInfo(1);
        console.log(`⏳ Still need to wait ${forgingInfo.timeRemaining} seconds`);
        console.log(`💡 Try running the script again after the wait time is complete.`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
