// Command to run this script:
// npx hardhat run scripts/test-forged-mint.js --network arbitrumSepolia

const hre = require('hardhat');

async function main() {
    console.log(`🧪 Testing ForgedMasterpieces minting on: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // ForgedMasterpieces contract address on Arbitrum Sepolia - NEW ADDRESS
    const forgedAddress = '0x094DC9DAfF67bE1D275cAc669147C2ee36839ecf';

    console.log(`📍 ForgedMasterpieces address: ${forgedAddress}`);

    try {
        // Get the ForgedMasterpieces contract
        const forgedContract = await hre.ethers.getContractAt('ForgedMasterpieces', forgedAddress);

        // Test parameters
        const recipient = '0x3006b25a6ccAdbF696794f96c08894E959702392';
        const tokenId = 1;
        const metadataURI = 'ipfs://test123';

        console.log(`\n🎨 Testing direct mint:`);
        console.log(`   Recipient: ${recipient}`);
        console.log(`   Token ID: ${tokenId}`);
        console.log(`   Metadata URI: ${metadataURI}`);

        // Check if token already exists
        try {
            const existingOwner = await forgedContract.ownerOf(tokenId);
            console.log(`⚠️  Token ${tokenId} already exists, owned by: ${existingOwner}`);
            console.log(`💡 Trying with token ID 999 instead...`);

            // Try with a different token ID
            const newTokenId = 999;
            const tx = await forgedContract.mintWithURI(recipient, newTokenId, metadataURI);
            console.log(`⏳ Transaction hash: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`✅ Successfully minted token ${newTokenId}!`);
            console.log(`⛏️  Mined in block: ${receipt.blockNumber}`);
        } catch (tokenError) {
            // Token doesn't exist, try minting with original ID
            console.log(`✅ Token ${tokenId} doesn't exist, proceeding with mint...`);

            const tx = await forgedContract.mintWithURI(recipient, tokenId, metadataURI);
            console.log(`⏳ Transaction hash: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`✅ Successfully minted token ${tokenId}!`);
            console.log(`⛏️  Mined in block: ${receipt.blockNumber}`);
        }

        console.log(`\n🎉 ForgedMasterpieces minting works! The issue is elsewhere.`);
    } catch (error) {
        console.error(`❌ Error testing ForgedMasterpieces mint:`, error.message);

        if (error.message.includes('onlyOwner')) {
            console.log(`💡 The contract still has ownership restrictions.`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
