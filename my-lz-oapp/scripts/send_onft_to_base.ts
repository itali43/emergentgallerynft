import hre from 'hardhat'
import { ethers } from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

// Usage (run on SOURCE network, not on Base):
// npx hardhat run scripts/send_onft_to_base.ts --network arbitrumSepolia -- \
//   --recipient 0xRecipientOnBase \
//   [--tokenId 1] \
//   [--onft 0xYourSourceONFT] \
//   [--compose "ipfs://yourMetadataURI"]
// If --onft omitted, uses deployments (MyONFT721) or env ONFT_ADDRESS.
// If --tokenId omitted, auto-picks the highest tokenId owned by the sender.

function getArg(flag: string): string | undefined {
    const i = process.argv.indexOf(flag)
    return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined
}

async function main() {
    const recipient = getArg('--recipient') || process.env.RECIPIENT
    const tokenIdStr = getArg('--tokenId') || process.env.TOKEN_ID
    const onftAddressArg = getArg('--onft')
    const compose = getArg('--compose') // optional

    if (!recipient) throw new Error('Missing --recipient (destination EOA on Base)')

    let onftAddress = onftAddressArg || process.env.ONFT_ADDRESS
    let resolvedFromDeploy = false
    if (!onftAddress) {
        try {
            const dep = await hre.deployments.get('MyONFT721')
            onftAddress = dep.address
            resolvedFromDeploy = true
        } catch {}
    }
    if (!onftAddress) throw new Error('Provide --onft or set ONFT_ADDRESS or deploy MyONFT721 on this source network.')

    const [signer] = await ethers.getSigners()
    const sender = await signer.getAddress()
    console.log('Source network:', hre.network.name)
    console.log('Sender:', sender)
    console.log('ONFT:', onftAddress, resolvedFromDeploy ? '(from deployments)' : '')

    const onft = await ethers.getContractAt('MyONFT721', onftAddress)

    // Resolve tokenId: use provided or auto-pick highest owned
    let tokenId = undefined as unknown as ReturnType<typeof ethers.BigNumber.from>
    if (tokenIdStr) {
        tokenId = ethers.BigNumber.from(tokenIdStr)
    } else {
        // Auto-pick: iterate from totalMinted downwards to find first owned by sender
        const totalMinted = await onft.totalMinted()
        console.log('Auto-picking tokenId. totalMinted:', totalMinted.toString())
        let found: string | undefined
        for (let id = totalMinted.toNumber(); id >= 1; id--) {
            try {
                const owner: string = await onft.ownerOf(id)
                if (owner.toLowerCase() === sender.toLowerCase()) {
                    found = id.toString()
                    break
                }
            } catch {}
        }
        if (!found)
            throw new Error('Could not find any token owned by sender on this chain. Provide --tokenId explicitly.')
        tokenId = ethers.BigNumber.from(found)
        console.log('Selected tokenId:', tokenId.toString())
    }

    // Build options (tune gas as needed)
    const optionsHex = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()
    const dstEid = EndpointId.BASESEP_V2_TESTNET
    const toBytes32 = ethers.utils.zeroPad(recipient, 32)
    const composeBytes = compose ? ethers.utils.toUtf8Bytes(compose) : '0x'

    const sendParam: any = [dstEid, toBytes32, tokenId, optionsHex, composeBytes, '0x']

    // Quote and send
    const feeStruct = await onft.quoteSend(sendParam, false)
    const nativeFee = Array.isArray(feeStruct) ? feeStruct[0] : feeStruct.nativeFee
    console.log('Quoted nativeFee:', nativeFee.toString())

    const tx = await onft.send(sendParam, [nativeFee, 0], sender, { value: nativeFee })
    console.log('send tx:', tx.hash)
    await tx.wait()
    console.log('ONFT send submitted to Base Sepolia.')
}

main().catch((e) => {
    console.error(e)
    process.exitCode = 1
})
