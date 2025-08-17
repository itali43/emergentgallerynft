// ts-node execution will have hardhat runtime injected; use hre.ethers
import { ethers } from 'hardhat'

async function main() {
    const [signer] = await ethers.getSigners()
    const addr = await signer.getAddress()
    console.log('Signer:', addr)

    const pendingNonce = await ethers.provider.getTransactionCount(addr, 'pending')
    const latestNonce = await ethers.provider.getTransactionCount(addr, 'latest')
    console.log('latest nonce:', latestNonce, 'pending nonce:', pendingNonce)

    if (pendingNonce === latestNonce) {
        console.log('No pending tx detected for this signer. Nothing to replace.')
        return
    }

    const fee = await ethers.provider.getFeeData()
    const maxFeePerGas = fee.maxFeePerGas ? fee.maxFeePerGas.mul(12).div(10) : ethers.utils.parseUnits('0.5', 'gwei')
    const maxPriorityFeePerGas = fee.maxPriorityFeePerGas
        ? fee.maxPriorityFeePerGas.mul(12).div(10)
        : ethers.utils.parseUnits('0.1', 'gwei')

    console.log('Replacing pending tx with nonce =', pendingNonce)
    console.log('Fees:', {
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    })

    const tx = await signer.sendTransaction({
        to: addr,
        value: 0,
        nonce: pendingNonce,
        maxFeePerGas,
        maxPriorityFeePerGas,
    })
    console.log('Replacement tx sent:', tx.hash)
    await tx.wait()
    console.log('Replacement tx mined.')
}

main().catch((err) => {
    console.error(err)
    process.exitCode = 1
})
