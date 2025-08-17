// Command to run this script:
// npx hardhat run scripts/set-peer-flow.js --network baseSepolia

const hre = require('hardhat');

async function main() {
    console.log(`🔗 Setting Flow Testnet peer connection on network: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721';
    const deployment = await hre.deployments.get(contractName);
    const contract = await hre.ethers.getContractAt(contractName, deployment.address);

    console.log(`📍 Contract address: ${deployment.address}`);

    // Flow Testnet configuration
    const flowEid = 40292;
    const flowContractAddress = '0xFF79Bc88E293d236e9aB0afbB045aEc972290313'; // CORRECT Flow Testnet address
    const flowPeerBytes32 = hre.ethers.utils.hexZeroPad(flowContractAddress, 32);

    console.log(`\n🌊 Setting peer for Flow Testnet:`);
    console.log(`   EID: ${flowEid}`);
    console.log(`   Contract Address: ${flowContractAddress}`);
    console.log(`   Peer Bytes32: ${flowPeerBytes32}`);

    // Check current peer
    const currentPeer = await contract.peers(flowEid);
    console.log(`🔍 Current peer: ${currentPeer}`);

    const currentAddress = `0x${currentPeer.slice(-40)}`;
    if (currentAddress.toLowerCase() === flowContractAddress.toLowerCase()) {
        console.log(`✅ Peer already set correctly for Flow Testnet!`);
        return;
    }

    if (currentPeer !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log(`⚠️  Peer is set to wrong address: ${currentAddress}`);
        console.log(`🔄 Updating to correct address: ${flowContractAddress}`);
    }

    // Set the peer connection
    console.log(`\n🔧 Setting peer connection for Flow Testnet...`);
    const tx = await contract.setPeer(flowEid, flowPeerBytes32);
    console.log(`⏳ Transaction hash: ${tx.hash}`);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log(`⛏️  Transaction mined in block: ${receipt.blockNumber}`);

    // Verify the update
    const updatedPeer = await contract.peers(flowEid);
    const peerAddress = `0x${updatedPeer.slice(-40)}`;
    console.log(`✅ Successfully set peer to: ${peerAddress}`);

    console.log(`\n🎉 Flow Testnet peer connection configured! Now you can send to Flow! 🌊`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
