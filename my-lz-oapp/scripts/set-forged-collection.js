// Command to run this script:
// npx hardhat run scripts/set-forged-collection.js --network baseSepolia

const hre = require('hardhat');

async function main() {
    console.log(`⚙️ Setting forged collection on network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Forged collection addresses from the NEW deployment output
    const forgedCollections = {
        40231: '0x094DC9DAfF67bE1D275cAc669147C2ee36839ecf', // Arbitrum Sepolia - NEW
        40245: '0x3304cF4c91762Ad91bC543b32600BF6216f9ba84', // Base Sepolia - NEW
        40292: '0x094DC9DAfF67bE1D275cAc669147C2ee36839ecf', // Flow Testnet - NEW
    };

    const networkNames = {
        40231: 'Arbitrum Sepolia',
        40245: 'Base Sepolia',
        40292: 'Flow Testnet',
    };

    // Set forged collection for all networks
    const targetEids = [40231, 40245, 40292]; // Arbitrum Sepolia, Base Sepolia, Flow Testnet

    for (const targetEid of targetEids) {
        const forgedCollectionAddress = forgedCollections[targetEid];

        console.log(`\n🎨 Setting forged collection for ${networkNames[targetEid]} (EID: ${targetEid})`);
        console.log(`📍 Forged collection address: ${forgedCollectionAddress}`);

        // Check current setting
        const currentCollection = await contract.forgedCollectionByEid(targetEid);
        console.log(`🔍 Current setting: ${currentCollection}`);

        if (currentCollection.toLowerCase() === forgedCollectionAddress.toLowerCase()) {
            console.log(`✅ Forged collection is already set correctly for ${networkNames[targetEid]}!`);
            continue;
        }

        // Set the forged collection
        console.log(`🔧 Setting forged collection for ${networkNames[targetEid]}...`);
        const tx = await contract.setForgedCollection(targetEid, forgedCollectionAddress);
        console.log(`⏳ Transaction hash: ${tx.hash}`);

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log(`⛏️  Transaction mined in block: ${receipt.blockNumber}`);

        // Verify the update
        const updatedCollection = await contract.forgedCollectionByEid(targetEid);
        console.log(`✅ Successfully set forged collection to: ${updatedCollection}`);

        // Check for event
        const event = receipt.events?.find((event) => event.event === 'ForgedCollectionDeployed');
        if (event) {
            console.log(`📝 ForgedCollectionDeployed event emitted:`);
            console.log(`   EID: ${event.args?.localEid}`);
            console.log(`   Collection: ${event.args?.collection}`);
        }
    }

    console.log(`\n🎉 All forged collections configured! Now you can send forged NFTs to all networks! 🚀`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
