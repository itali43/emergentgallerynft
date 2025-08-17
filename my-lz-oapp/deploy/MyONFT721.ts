import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'MyONFT721'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    if (hre.network.config.onft721Adapter != null) {
        console.warn(`onft721Adapter configuration found on OFT deployment, skipping ONFT721 deployment`)
        return
    }

    // Optional forged collection env var per network
    const zero = '0x0000000000000000000000000000000000000000'
    const forgedCollection =
        hre.network.name === 'arbitrumSepolia'
            ? (process.env.FM_ARB ?? zero)
            : hre.network.name === 'baseSepolia'
              ? (process.env.FM_BASE ?? zero)
              : hre.network.name === 'flowTestnet'
                ? (process.env.FM_FLOW ?? zero)
                : zero

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            'MyONFT721', // name
            'ONFT', // symbol
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            deployer, // owner
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)

    // Set forged collection if provided
    if (forgedCollection !== zero) {
        console.log(`Setting forged collection for ${hre.network.name}: ${forgedCollection}`)
        const contract = await hre.ethers.getContractAt(contractName, address)

        // Get the local EID from the network config
        const localEid = hre.network.config.eid
        if (!localEid) {
            console.warn(`No EID found in network config for ${hre.network.name}, skipping forged collection setup`)
            return
        }

        const tx = await contract.setForgedCollection(localEid, forgedCollection)
        await tx.wait()
        console.log(`Forged collection set successfully for EID ${localEid}`)
    }
}

deploy.tags = [contractName]

export default deploy
