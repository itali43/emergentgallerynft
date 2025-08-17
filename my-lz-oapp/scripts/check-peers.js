// Command to run this script:
// npx hardhat run scripts/check-peers.js --network baseSepolia

const hre = require('hardhat');

async function main() {
    console.log(`🔍 Checking LayerZero peer connections on network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Endpoint IDs for different networks
    const networks = {
        baseSepolia: { eid: 40245, name: 'Base Sepolia' },
        arbitrumSepolia: { eid: 40231, name: 'Arbitrum Sepolia' },
        flowTestnet: { eid: 40292, name: 'Flow Testnet' },
    };

    // Contract addresses (you'll need to update these with actual deployed addresses)
    const contractAddresses = {
        baseSepolia: '0xE6DF4dD9a2ad8b0DC780f999C6D727383E180Fd3',
        arbitrumSepolia: '0xE6DF4dD9a2ad8b0DC780f999C6D727383E180Fd3', // Update with actual address
        flowTestnet: '0xE6DF4dD9a2ad8b0DC780f999C6D727383E180Fd3', // Update with actual address
    };

    console.log(`\n🔗 Current peer connections:`);

    // Check existing peer connections
    for (const [networkName, networkInfo] of Object.entries(networks)) {
        if (networkName === hre.network.name) continue; // Skip current network

        try {
            const peerBytes32 = await contract.peers(networkInfo.eid);
            const peerAddress =
                peerBytes32 === '0x0000000000000000000000000000000000000000000000000000000000000000'
                    ? 'Not set'
                    : `0x${peerBytes32.slice(-40)}`;

            console.log(`   ${networkInfo.name} (EID: ${networkInfo.eid}): ${peerAddress}`);
        } catch (error) {
            console.log(`   ${networkInfo.name} (EID: ${networkInfo.eid}): Error checking peer`);
        }
    }

    // Check forged collection settings
    console.log(`\n🎨 Forged collection settings:`);
    for (const [networkName, networkInfo] of Object.entries(networks)) {
        try {
            const forgedCollection = await contract.forgedCollectionByEid(networkInfo.eid);
            const isSet = forgedCollection !== '0x0000000000000000000000000000000000000000';
            console.log(`   ${networkInfo.name} (EID: ${networkInfo.eid}): ${isSet ? forgedCollection : 'Not set'}`);
        } catch (error) {
            console.log(`   ${networkInfo.name} (EID: ${networkInfo.eid}): Error checking forged collection`);
        }
    }

    // Check ownership
    const owner = await contract.owner();
    const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
    console.log(`\n👤 Contract owner: ${owner}`);
    console.log(`🔑 You are owner: ${isOwner}`);

    if (!isOwner) {
        console.log(`\n⚠️  You are not the contract owner. Cannot set peer connections.`);
        return;
    }

    // Suggest setting up peers if not configured
    console.log(`\n💡 To set up peer connections, you can run:`);
    for (const [networkName, networkInfo] of Object.entries(networks)) {
        if (networkName === hre.network.name) continue;

        const peerAddress = contractAddresses[networkName];
        const peerBytes32 = hre.ethers.utils.hexZeroPad(peerAddress, 32);

        console.log(`   // Set peer for ${networkInfo.name}`);
        console.log(`   await contract.setPeer(${networkInfo.eid}, "${peerBytes32}")`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
