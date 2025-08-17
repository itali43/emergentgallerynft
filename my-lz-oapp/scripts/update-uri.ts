import hre from 'hardhat'

function getArg(flag: string): string | undefined {
    const idx = process.argv.indexOf(flag)
    if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1]
    return undefined
}

async function main() {
    console.log(`Updating token URI on network: ${hre.network.name}`)

    // Get command line arguments
    const tokenIdStr = getArg('--tokenId') || process.env.TOKEN_ID
    const newURI = getArg('--uri') || process.env.NEW_URI

    if (!tokenIdStr) {
        throw new Error('Missing tokenId (use --tokenId or TOKEN_ID env variable)')
    }
    if (!newURI) {
        throw new Error('Missing URI (use --uri or NEW_URI env variable)')
    }

    const tokenId = parseInt(tokenIdStr)
    console.log(`Token ID: ${tokenId}`)
    console.log(`New URI: ${newURI}`)

    // Get the deployer account (must be contract owner)
    const [deployer] = await hre.ethers.getSigners()
    console.log(`Updating with account: ${deployer.address}`)
    console.log(`Account balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH`)

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721'
    const deployment = await hre.deployments.get(contractName)
    const contract = await hre.ethers.getContractAt(contractName, deployment.address)

    console.log(`Contract address: ${deployment.address}`)

    // Check if token exists by trying to get its current URI
    try {
        const currentURI = await contract.tokenURI(tokenId)
        console.log(`Current URI: ${currentURI || '(empty)'}`)
    } catch (error) {
        console.error(`Token ${tokenId} may not exist or has no URI set`)
        throw error
    }

    // Check if we're the owner of the contract
    const contractOwner = await contract.owner()
    if (contractOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(
            `Only contract owner can update URIs. Owner: ${contractOwner}, Your address: ${deployer.address}`
        )
    }

    // Update the token URI
    console.log(`\nUpdating token ${tokenId} URI...`)
    const tx = await contract.setTokenURI(tokenId, newURI)
    console.log(`Transaction hash: ${tx.hash}`)

    // Wait for transaction to be mined
    const receipt = await tx.wait()
    console.log(`Transaction mined in block: ${receipt.blockNumber}`)

    // Verify the update
    const updatedURI = await contract.tokenURI(tokenId)
    console.log(`✅ Successfully updated token ${tokenId} URI to: ${updatedURI}`)

    // Check for URI update event
    const uriUpdateEvent = receipt.events?.find((event: any) => event.event === 'TokenURIUpdated')
    if (uriUpdateEvent) {
        console.log(`📝 TokenURIUpdated event emitted for token ${uriUpdateEvent.args?.tokenId}`)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
