import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

// Expected env vars (set per-network as needed):
// ARBITRUM_FORGED_COLLECTION, BASE_FORGED_COLLECTION, FLOW_FORGED_COLLECTION
// Optionally: ONFT_ADDRESS (if not using deployments)

const func: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts, network } = hre
    const { log } = deployments
    const { deployer } = await getNamedAccounts()

    log(`Network: ${network.name}`)
    log(`Deployer: ${deployer}`)

    // Resolve forged collection address from env by network
    let forgedCollectionEnv: string | undefined
    let localEid: number | undefined

    switch (network.name) {
        case 'arbitrumSepolia':
            forgedCollectionEnv = process.env.FM_ARB
            localEid = EndpointId.ARBSEP_V2_TESTNET
            break
        case 'baseSepolia':
            forgedCollectionEnv = process.env.FM_BASE
            localEid = EndpointId.BASESEP_V2_TESTNET
            break
        case 'flowTestnet':
            forgedCollectionEnv = process.env.FM_FLOW
            localEid = EndpointId.FLOW_V2_TESTNET
            break
        default:
            throw new Error(`Unsupported network for configuration: ${network.name}`)
    }

    if (!forgedCollectionEnv || forgedCollectionEnv === '') {
        log('No forged collection env var set for this network; skipping configuration.')
        return
    }

    const forgedCollection = forgedCollectionEnv
    log(`Using forged collection: ${forgedCollection}`)

    // Resolve ONFT address: prefer deployments, else env ONFT_ADDRESS
    let onftAddress: string
    try {
        const dep = await deployments.get('MyONFT721')
        onftAddress = dep.address
        log(`Found deployed MyONFT721 at ${onftAddress}`)
    } catch {
        const fromEnv = process.env.ONFT_ADDRESS
        if (!fromEnv) throw new Error('MyONFT721 not found in deployments and ONFT_ADDRESS env not provided')
        onftAddress = fromEnv
        log(`Using ONFT_ADDRESS from env: ${onftAddress}`)
    }

    const onft = await ethers.getContractAt('MyONFT721', onftAddress)

    // Check current mapping to avoid redundant tx
    const current = await onft.forgedCollectionByEid(localEid)
    if (current && current.toLowerCase() === forgedCollection.toLowerCase()) {
        log(`forgedCollectionByEid[${localEid}] is already set to ${current}. Skipping.`)
        return
    }

    const tx = await onft.connect(await ethers.getSigner(deployer)).setForgedCollection(localEid, forgedCollection)
    log(`setForgedCollection(${localEid}, ${forgedCollection}) tx: ${tx.hash}`)
    await tx.wait()
    log('Forged collection mapping updated.')
}

func.tags = ['ConfigureForgedCollection']

export default func
