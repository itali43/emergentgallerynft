import hre from 'hardhat'

async function main() {
    console.log(`Minting NFT on network: ${hre.network.name}`)

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners()
    console.log(`Minting with account: ${deployer.address}`)
    console.log(`Account balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH`)

    // Get the deployed MyONFT721 contract
    const contractName = 'MyONFT721'
    const deployment = await hre.deployments.get(contractName)
    const contract = await hre.ethers.getContractAt(contractName, deployment.address)

    console.log(`Contract address: ${deployment.address}`)

    // Check current token count before minting
    const currentTokenId = await contract.getCurrentTokenId()
    const totalMinted = await contract.totalMinted()
    console.log(`Current token ID: ${currentTokenId}`)
    console.log(`Total minted so far: ${totalMinted}`)

    // Mint NFT to the deployer address
    console.log(`\nMinting NFT to: ${deployer.address}`)
    const tx = await contract.mint(deployer.address)
    console.log(`Transaction hash: ${tx.hash}`)

    // Wait for transaction to be mined
    const receipt = await tx.wait()
    console.log(`Transaction mined in block: ${receipt.blockNumber}`)

    // Get the minted token ID from the event
    const tokenMintedEvent = receipt.events?.find((event: any) => event.event === 'TokenMinted')
    if (tokenMintedEvent) {
        const tokenId = tokenMintedEvent.args?.tokenId
        console.log(`✅ Successfully minted NFT with token ID: ${tokenId}`)
    }

    // Check updated counts
    const newCurrentTokenId = await contract.getCurrentTokenId()
    const newTotalMinted = await contract.totalMinted()
    console.log(`\nUpdated stats:`)
    console.log(`Next token ID: ${newCurrentTokenId}`)
    console.log(`Total minted: ${newTotalMinted}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
