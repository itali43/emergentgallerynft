// npx hardhat deploy --network flowTestnet --tags ForgedMasterpieces
// etc

import { DeployFunction } from 'hardhat-deploy/types'

const NAME = 'EmergentGalleryForgeries'
const SYMBOL = 'EGF'

const func: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log(`Network: ${network.name}`)
    log(`Deployer: ${deployer}`)
    log(`Deploying ForgedMasterpieces with name='${NAME}', symbol='${SYMBOL}', owner='${deployer}'`)

    const result = await deploy('ForgedMasterpieces', {
        from: deployer,
        args: [NAME, SYMBOL, deployer],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    log(`ForgedMasterpieces deployed at: ${result.address}`)
}

func.tags = ['ForgedMasterpieces']

export default func
