import hre from 'hardhat'
import { ethers, deployments } from 'hardhat'

// Usage examples:
// npx hardhat run scripts/mint_onft.ts --network baseSepolia -- --recipient 0xYourAddr --tokenId 1
// Or provide ONFT_ADDRESS, RECIPIENT, TOKEN_ID env vars

function getArg(flag: string): string | undefined {
    const idx = process.argv.indexOf(flag)
    if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1]
    return undefined
}

async function main() {
    const recipient = getArg('--recipient') || process.env.RECIPIENT
    const tokenIdStr = getArg('--tokenId') || process.env.TOKEN_ID

    if (!recipient) throw new Error('Missing recipient (use --recipient or RECIPIENT env)')
    if (!tokenIdStr) throw new Error('Missing tokenId (use --tokenId or TOKEN_ID env)')
    const tokenId = ethers.BigNumber.from(tokenIdStr)

    // Only work with Base Sepolia network
    if (hre.network.name !== 'baseSepolia') {
        throw new Error('This script only works on baseSepolia network. Use --network baseSepolia')
    }

    // Resolve contract address - only look for MyONFT721 (no mock)
    let contractAddress = process.env.ONFT_ADDRESS
    const contractName = 'MyONFT721'

    if (!contractAddress) {
        try {
            const dep = await deployments.get(contractName)
            contractAddress = dep.address
            console.log(`Resolved ${contractName} at ${contractAddress} from deployments on ${hre.network.name}`)
        } catch {
            throw new Error(
                'MyONFT721 contract not found in deployments. Provide ONFT_ADDRESS env or deploy MyONFT721 first.'
            )
        }
    }

    const [signer] = await ethers.getSigners()
    console.log('Network:', hre.network.name)
    console.log('Deployer:', await signer.getAddress())

    const contract = await ethers.getContractAt(contractName, contractAddress!)

    // Check if the contract has a mint function
    if (!('mint' in contract.functions)) {
        throw new Error(
            `ERROR: ${contractName} does not expose a public mint(address,uint256) function.\n` +
                `The deployed MyONFT721 contract only has internal _mint() function.\n` +
                `You need to either:\n` +
                `1. Add a public mint function to the contract (requires redeployment)\n` +
                `2. Use the owner to call a custom minting function if one exists\n` +
                `3. Mint tokens during deployment or through contract initialization\n\n` +
                `Available functions: ${Object.keys(contract.functions).join(', ')}`
        )
    }

    console.log(`Minting tokenId=${tokenId.toString()} to ${recipient} on ${contractName} at ${contractAddress}`)
    const tx = await contract.connect(signer).mint(recipient, tokenId)
    console.log('tx hash:', tx.hash)
    await tx.wait()
    console.log('Mint complete')
}

main().catch((e) => {
    console.error(e)
    process.exitCode = 1
})
