// Command to run this script:
// npx hardhat run scripts/check-forged-owner.js --network arbitrumSepolia

const hre = require('hardhat');

async function main() {
    console.log(`🔍 Checking ForgedMasterpieces contract ownership on: ${hre.network.name}`);

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📝 Using account: ${deployer.address}`);

    // ForgedMasterpieces contract address on Arbitrum Sepolia
    const forgedAddress = '0x999F10125807398d2D83a8d2a676a504deC5fAd8';

    console.log(`📍 ForgedMasterpieces address: ${forgedAddress}`);

    try {
        // Get the ForgedMasterpieces contract
        const forgedContract = await hre.ethers.getContractAt('ForgedMasterpieces', forgedAddress);

        // Check owner
        const owner = await forgedContract.owner();
        console.log(`👤 ForgedMasterpieces owner: ${owner}`);
        console.log(`🔑 Your address: ${deployer.address}`);
        console.log(`✅ You are owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);

        // Get MyONFT721 contract address on this network
        const onftDeployment = await hre.deployments.get('MyONFT721');
        const onftAddress = onftDeployment.address;
        console.log(`🏭 MyONFT721 address: ${onftAddress}`);

        // Check if MyONFT721 is the owner (it should be for minting to work)
        const isONFTOwner = owner.toLowerCase() === onftAddress.toLowerCase();
        console.log(`🔗 MyONFT721 is ForgedMasterpieces owner: ${isONFTOwner}`);

        if (!isONFTOwner) {
            console.log(`\n⚠️  ISSUE FOUND: MyONFT721 is not the owner of ForgedMasterpieces!`);
            console.log(
                `💡 The ForgedMasterpieces contract needs to be owned by MyONFT721 for cross-chain minting to work.`
            );
            console.log(`\n🔧 To fix this, run:`);
            console.log(`   const forged = await ethers.getContractAt('ForgedMasterpieces', '${forgedAddress}')`);
            console.log(`   await forged.transferOwnership('${onftAddress}')`);
        } else {
            console.log(`\n✅ Ownership is correct! MyONFT721 owns ForgedMasterpieces.`);
        }
    } catch (error) {
        console.error(`❌ Error checking contract:`, error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
