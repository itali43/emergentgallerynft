import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'

import { Options } from '@layerzerolabs/lz-v2-utilities'

describe('MyONFT721 Test', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    // Declaration of variables to be used in the test suite
    let MyONFT721: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let myONFT721A: Contract
    let myONFT721B: Contract
    let mockEndpointV2A: Contract
    let mockEndpointV2B: Contract

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factory for our tested contract
        //
        // We are using a derived contract that exposes a mint() function for testing purposes
        MyONFT721 = await ethers.getContractFactory('MyONFT721Mock')

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
        const signers = await ethers.getSigners()

        ;[ownerA, ownerB, endpointOwner] = signers

        // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
        // and its artifacts are connected as external artifacts to this project
        //
        // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts,
        // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
        //
        // See https://github.com/NomicFoundation/hardhat/issues/1040
        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner)
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        // Deploying a mock LZEndpoint with the given Endpoint ID
        mockEndpointV2A = await EndpointV2Mock.deploy(eidA)
        mockEndpointV2B = await EndpointV2Mock.deploy(eidB)

        // Deploying two instances of MyOFT contract with different identifiers and linking them to the mock LZEndpoint
        myONFT721A = await MyONFT721.deploy('aONFT721', 'aONFT721', mockEndpointV2A.address, ownerA.address)
        myONFT721B = await MyONFT721.deploy('bONFT721', 'bONFT721', mockEndpointV2B.address, ownerB.address)

        // Setting destination endpoints in the LZEndpoint mock for each MyONFT721 instance
        await mockEndpointV2A.setDestLzEndpoint(myONFT721B.address, mockEndpointV2B.address)
        await mockEndpointV2B.setDestLzEndpoint(myONFT721A.address, mockEndpointV2A.address)

        // Setting each MyONFT721 instance as a peer of the other in the mock LZEndpoint
        await myONFT721A.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myONFT721B.address, 32))
        await myONFT721B.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myONFT721A.address, 32))
    })

    // A test case to verify token transfer functionality
    it('should send a token from A address to B address', async function () {
        // Minting an initial amount of tokens to ownerA's address in the myONFT721A contract
        const initialTokenId = 0
        await myONFT721A.mint(ownerA.address, initialTokenId)

        // Defining extra message execution options for the send operation
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        const sendParam = [eidB, ethers.utils.zeroPad(ownerB.address, 32), initialTokenId, options, '0x', '0x']

        // Fetching the native fee for the token send operation
        const [nativeFee] = await myONFT721A.quoteSend(sendParam, false)

        // Executing the send operation from myONFT721A contract
        await myONFT721A.send(sendParam, [nativeFee, 0], ownerA.address, { value: nativeFee })

        // Fetching the final token balances of ownerA and ownerB
        const finalBalanceA = await myONFT721A.balanceOf(ownerA.address)
        const finalBalanceB = await myONFT721B.balanceOf(ownerB.address)

        // Asserting that the final balances are as expected after the send operation
        expect(finalBalanceA).eql(ethers.BigNumber.from(0))
        expect(finalBalanceB).eql(ethers.BigNumber.from(1))
    })

    // Test forge functionality
    it('should forge a new NFT with metadata on destination chain', async function () {
        // Minting an initial token to ownerA's address in the myONFT721A contract
        const tokenId = 1
        await myONFT721A.mint(ownerA.address, tokenId)

        // Check initial balances
        const initialBalanceA = await myONFT721A.balanceOf(ownerA.address)
        const initialBalanceB = await myONFT721B.balanceOf(ownerB.address)
        expect(initialBalanceA).eql(ethers.BigNumber.from(1))
        expect(initialBalanceB).eql(ethers.BigNumber.from(0))

        // Defining extra message execution options for the forge operation
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        // Create forge message with metadata URI in composeMsg
        const metadataURI = 'ipfs://QmYourMetadataHash'
        const composeMsgBytes = ethers.utils.toUtf8Bytes(metadataURI)

        const forgeSendParam = [
            eidB,
            ethers.utils.zeroPad(ownerB.address, 32),
            tokenId,
            options,
            composeMsgBytes, // This makes it a forge operation
            '0x',
        ]

        // Fetching the native fee for the forge operation
        const [nativeFee] = await myONFT721A.quoteSend(forgeSendParam, false)

        // Executing the forge operation from myONFT721A contract
        await myONFT721A.send(forgeSendParam, [nativeFee, 0], ownerA.address, { value: nativeFee })

        // Fetching the final token balances
        const finalBalanceA = await myONFT721A.balanceOf(ownerA.address)
        const finalBalanceB = await myONFT721B.balanceOf(ownerB.address)

        // Original NFT should stay with ownerA (not debited in forge operation)
        expect(finalBalanceA).eql(ethers.BigNumber.from(1))
        // New NFT should be minted to ownerB on chain B
        expect(finalBalanceB).eql(ethers.BigNumber.from(1))

        // Verify that ownerB owns the new token on chain B
        const ownerOfTokenOnB = await myONFT721B.ownerOf(tokenId)
        expect(ownerOfTokenOnB).to.equal(ownerB.address)
    })

    // Test forging masterpiece functionality
    it('should allow starting and completing masterpiece forging', async function () {
        const tokenId = 2
        await myONFT721A.mint(ownerA.address, tokenId)

        // Check initial forging state
        expect(await myONFT721A.isForgingMasterpiece(tokenId)).to.be.false

        // Start forging masterpiece
        await myONFT721A.connect(ownerA).startForgingMasterpiece(tokenId)

        // Check forging state
        expect(await myONFT721A.isForgingMasterpiece(tokenId)).to.be.true

        // Get forging info
        const forgingInfo = await myONFT721A.getForgingInfo(tokenId)
        expect(forgingInfo.isForging).to.be.true
        expect(forgingInfo.startTime.toNumber()).to.be.gt(0)
        expect(forgingInfo.completionTime.toNumber()).to.be.gt(forgingInfo.startTime.toNumber())
        expect(forgingInfo.timeRemaining.toNumber()).to.be.gt(0)

        // Should not be able to transfer while forging
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()
        const sendParam = [eidB, ethers.utils.zeroPad(ownerB.address, 32), tokenId, options, '0x', '0x']
        const [nativeFee] = await myONFT721A.quoteSend(sendParam, false)

        // Try to send while forging (should fail)
        let failed = false
        try {
            await myONFT721A.send(sendParam, [nativeFee, 0], ownerA.address, { value: nativeFee })
        } catch (error: any) {
            failed = true
            expect(error.message).to.include('NFTForgingMasterpieceInProgress')
        }
        expect(failed).to.be.true

        // Try to complete forging too early (should fail)
        let earlyCompleteFailed = false
        try {
            await myONFT721A.connect(ownerA).completeForgingMasterpiece(tokenId)
        } catch (error: any) {
            earlyCompleteFailed = true
            expect(error.message).to.include('ForgingNotComplete')
        }
        expect(earlyCompleteFailed).to.be.true

        // Fast forward time (simulate passage of forging duration)
        await ethers.provider.send('evm_increaseTime', [24 * 60 * 60 + 1]) // 24 hours + 1 second
        await ethers.provider.send('evm_mine', [])

        // Check that forging is complete
        expect(await myONFT721A.isForgingComplete(tokenId)).to.be.true

        // Complete forging masterpiece
        await myONFT721A.connect(ownerA).completeForgingMasterpiece(tokenId)

        // Check forging state after completion
        expect(await myONFT721A.isForgingMasterpiece(tokenId)).to.be.false

        // Should be able to transfer after forging is complete
        await myONFT721A.send(sendParam, [nativeFee, 0], ownerA.address, { value: nativeFee })

        // Verify the transfer worked
        const finalBalanceA = await myONFT721A.balanceOf(ownerA.address)
        const finalBalanceB = await myONFT721B.balanceOf(ownerB.address)
        expect(finalBalanceA).eql(ethers.BigNumber.from(0))
        expect(finalBalanceB).eql(ethers.BigNumber.from(1))
    })

    // Test that only owner or contract owner can lock/unlock
    it('should only allow owner or contract owner to start/complete forging', async function () {
        const tokenId = 3
        await myONFT721A.mint(ownerA.address, tokenId)

        // ownerB should not be able to start forging ownerA's token
        let unauthorizedStartFailed = false
        try {
            await myONFT721A.connect(ownerB).startForgingMasterpiece(tokenId)
        } catch (error: any) {
            unauthorizedStartFailed = true
            expect(error.message).to.include('Not owner or contract owner')
        }
        expect(unauthorizedStartFailed).to.be.true

        // ownerA should be able to start forging their own token
        await myONFT721A.connect(ownerA).startForgingMasterpiece(tokenId)

        // ownerB should not be able to complete forging ownerA's token
        let unauthorizedCompleteFailed = false
        try {
            await myONFT721A.connect(ownerB).completeForgingMasterpiece(tokenId)
        } catch (error: any) {
            unauthorizedCompleteFailed = true
            expect(error.message).to.include('Not owner or contract owner')
        }
        expect(unauthorizedCompleteFailed).to.be.true
    })
})
