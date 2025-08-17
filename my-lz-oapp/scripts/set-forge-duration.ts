// Command to run this script:
// npx hardhat run scripts/set-forge-duration.ts --network baseSepolia

import hre from 'hardhat'

async function main() {
    console.log(`⚙️ Setting forge duration on network: ${hre.network.name}`)

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners()
    console.log(`📝 Updating with account: ${deployer.address}`)
    console.log(`💰 Account balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH`)

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721'
    const deployment = await hre.deployments.get(contractName)
    const contract = await hre.ethers.getContractAt(contractName, deployment.address)

    console.log(`📍 Contract address: ${deployment.address}`)

    // Check current forging duration
    const currentDuration = await contract.forgingDuration()
    console.log(`⏰ Current forging duration: ${currentDuration} seconds (${currentDuration / 3600} hours)`)

    // Set new forging duration to 2 seconds
    const newDuration = 2
    console.log(`\n🔧 Setting forging duration to ${newDuration} seconds...`)

    const tx = await contract.setForgingDuration(newDuration)
    console.log(`⏳ Transaction hash: ${tx.hash}`)

    // Wait for transaction to be mined
    const receipt = await tx.wait()
    console.log(`⛏️  Transaction mined in block: ${receipt.blockNumber}`)

    // Verify the update
    const updatedDuration = await contract.forgingDuration()
    console.log(`✅ Successfully updated forging duration to: ${updatedDuration} seconds`)

    // Check for duration update event
    const durationUpdateEvent = receipt.events?.find((event: any) => event.event === 'ForgingDurationUpdated')
    if (durationUpdateEvent) {
        console.log(`📝 ForgingDurationUpdated event emitted:`)
        console.log(`   Old duration: ${durationUpdateEvent.args?.oldDuration} seconds`)
        console.log(`   New duration: ${durationUpdateEvent.args?.newDuration} seconds`)
    }

    console.log(`\n🎉 Forge duration updated successfully! Now you can forge in just 2 seconds! ⚡`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error)
        process.exit(1)
    })
