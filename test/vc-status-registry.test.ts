/*
 * Copyright 2019 Coöperatieve Rabobank U.A.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as chai from 'chai'
import * as sinon from 'sinon'
import * as chaiAsPromised from 'chai-as-promised'
import * as sinonChai from 'sinon-chai'
import { VcStatusRegistry, Wallet, TransactionCount, NewBlockData, ContractEventData } from '../src/vc-status-registry'
import { JsonRpcProvider, TransactionResponse } from 'ethers/providers'
import { ethers } from 'ethers'

const assert = chai.assert

before(() => {
  chai.should()
  chai.use(chaiAsPromised)
  chai.use(sinonChai)
})

// const privateKey = '53fd2ebe003d072fe914a90581b8d36964f2392ede2fab9618d4492cff85f35d';
// const issuer = '0xf8fC941a64cFb70C8E34010f7370D84076d0361A';
// const contractAddress = '0xe9fdf8130ad68fd11d195fb1e49a479e30b6d3d4';
// const credentialId = '0x72d3bc4da6e025540edbfee8b376918f95ec59e4';

describe('Test vcStatusRegistry functionality', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('should succesfully create vcStatusRegistry class with private key', () => {
    // Arrange
    const privateKey = '53fd2ebe003d072fe914a90581b8d36964f2392ede2fab9618d4492cff85f35d'
    const contractAddress = '0xe9fdf8130ad68fd11d195fb1e49a479e30b6d3d4'

    // Act
    const vcStatusRegistry = new VcStatusRegistry(
      'https://rinkeby.infura.io',
      contractAddress,
      privateKey
    )

    // Assert
    assert.exists(vcStatusRegistry)
  })

  it('should succesfully create vcStatusRegistry class without private key', () => {
    // Arrange
    const contractAddress = '0xe9fdf8130ad68fd11d195fb1e49a479e30b6d3d4'

    // Act
    const vcStatusRegistry = new VcStatusRegistry(
      'https://rinkeby.infura.io',
      contractAddress
    )

    // Assert
    assert.exists(vcStatusRegistry)
  })

  it('should throw error if non existent ethereum-provider used', async () => {
    // Arrange
    const privateKey = '53fd2ebe003d072fe914a90581b8d36964f2392ede2fab9618d4492cff85f35d'
    const issuer = '0xf8fC941a64cFb70C8E34010f7370D84076d0361A'
    const contractAddress = '0xe9fdf8130ad68fd11d195fb1e49a479e30b6d3d4'
    const credentialId = '0x72d3bc4da6e025540edbfee8b376918f95ec59e4'

    // Act
    const vcStatusRegistry = new VcStatusRegistry(
      'https://not-exists.infura.io',
      contractAddress,
      privateKey
    )

    const wrapper = async () => {
      return vcStatusRegistry.getVcStatus(issuer, credentialId)
    }

    // Assert
    assert.isRejected(wrapper(), 'Cannot read property \'getVcStatus\' of undefined')
  })

  it('should not add a value to the registry if not initialized with privateKey', async () => {
    // Arrange
    const contractAddress = '0xe9fdf8130ad68fd11d195fb1e49a479e30b6d3d4'
    const credentialId = '0x72d3bc4da6e025540edbfee8b376918f95ec59e4'

    // Act
    const vcStatusRegistry = new VcStatusRegistry(
      'https://rinkeby.infura.io',
      contractAddress
    )

    // Assert
    vcStatusRegistry.removeVcStatus(credentialId).should.eventually.be.rejectedWith('Error: Can not call "removeVcStatus" without privateKey')
  })

  // Arrange
  const issuer = '0xf8fC941a64cFb70C8E34010f7370D84076d0361A'
  const privateKey = '53fd2ebe003d072fe914a90581b8d36964f2392ede2fab9618d4492cff85f35d'
  const contractAddress = '0xe9fdf8130ad68fd11d195fb1e49a479e30b6d3d4'
  const credentialId1 = '0xf8fC941a64cFb70C8E34010f7370D84076d0361A'
  const credentialId2 = '0xe9fdf8130ad68fd11d195fb1e49a479e30b6d3d4'
  const credentialId3 = '0x72d3bc4da6e025540edbfee8b376918f95ec59e4'
  const provider = 'https://rinkeby.infura.io'

  const vcStatusRegistry = new VcStatusRegistry(
    provider,
    contractAddress,
    privateKey
  )

  it('should return wallet', async () => {
    const result = vcStatusRegistry.wallet as Wallet
    assert.deepEqual(result.address, '0xac9E10ab57f6DcDad1bA0C634EdCAE25116F5dab')
    assert.deepEqual(result.privateKey, '0x' + privateKey)
  })

  it('should return provider', async () => {
    const result = vcStatusRegistry.provider
    assert.isObject(result)
  })

  it('should return ethereumProvider', async () => {
    const result = vcStatusRegistry.ethereumProvider
    assert.deepEqual(result, provider)
  })

  it('should return contractAddress', () => {
    const result = vcStatusRegistry.contractAddress
    assert.deepEqual(result, contractAddress)
  })

  it('should succesfully getVcStatus function()', async () => {
    const stubGetVcStatus = sinon
      .stub(vcStatusRegistry, 'getVcStatus')
      .returns(Promise.resolve('true'))

    const result = await vcStatusRegistry.getVcStatus(issuer, credentialId3)

    // Assert
    assert.isTrue(stubGetVcStatus.calledOnce)
    assert.isTrue(Boolean(result))
  })

  it('should add values to the registry', async () => {
    const stubContractMethod = sinon
      .stub(vcStatusRegistry as any, '_contractMethod')
      .returns(Promise.resolve({ hash: 'dude' } as TransactionResponse))
    sinon
      .stub(vcStatusRegistry as any, '_getTransactionCount')
      .returns(Promise.resolve(31415))

    // Call it twice so 'racing' is also tested
    const res = await Promise.all([
      vcStatusRegistry.setVcStatus(credentialId1),
      vcStatusRegistry.setVcStatus(credentialId2)
    ])

    // Assert
    assert.isTrue(stubContractMethod.calledTwice)
    assert.deepEqual(res, ['dude', 'dude'])
  })

  it('should remove a value from the registry', async () => {
    const stubContractMethod = sinon
      .stub(vcStatusRegistry as any, '_contractMethod')
      .returns(Promise.resolve({ hash: 'dude' } as TransactionResponse))
    sinon
      .stub(vcStatusRegistry as any, '_getTransactionCount')
      .returns(Promise.resolve(31415))

    await vcStatusRegistry.removeVcStatus(credentialId3)

    // Assert
    assert.isTrue(stubContractMethod.calledOnce)
  })

  const vcStatusRegistryKeyless = new VcStatusRegistry(
    provider,
    contractAddress
  )

  it('should throw if setVcStatus is called without privateKey', async () => {
    const stubContractMethod = sinon
      .stub(vcStatusRegistry as any, '_contractMethod')
      .returns(Promise.resolve({ hash: 'dude' } as TransactionResponse))
    sinon
      .stub(vcStatusRegistry as any, '_getTransactionCount')
      .returns(Promise.resolve(31415))

    const wrapper = async () => {
      return vcStatusRegistryKeyless.setVcStatus(credentialId1)
    }

    // Assert
    assert.isRejected(wrapper(), 'Error: Can not call "setVcStatus" without privateKey')
  })

  it('should create and get a transaction count', async () => {
    const wallet = new Wallet(privateKey, vcStatusRegistry.provider)
    const transactionCount = new TransactionCount(wallet)

    sinon
       .stub(transactionCount as any, '_getTransactionCount')
      .returns(Promise.resolve(0))

    const count1 = await transactionCount.transactionCount()
    const count2 = await transactionCount.transactionCount()

    assert.deepEqual(count1, 0)
    assert.deepEqual(count2, 1)
  })

  it('should forward the event when SetVcStatus happens on the contract', async () => {
    const providerData = {
      blockNumber: 12,
      blockHash: 'someHash',
      transactionIndex: 12,
      removed: true,
      address: '0xasd',
      data: 'SomeDataHere',
      topics: ['0xa', '0xb'],
      transactionHash: 'hashControl',
      logIndex: 54
    }
    const statusSetFilter = {
      address: contractAddress,
      topics: [ethers.utils.id('VcStatusSet(address,address)')]
    }
    let returnData: ContractEventData
    vcStatusRegistry.onSetVcStatus.subscribe(async (e: ContractEventData) => {
      returnData = e
    })
    vcStatusRegistry.provider.emit(statusSetFilter, providerData)
    setTimeout(() => {
      assert.deepEqual(returnData, providerData)
    },1)
  })
  it('should forward the event when RemoveVcStatus happens on the contract', async () => {
    const providerData = {
      blockNumber: 12,
      blockHash: 'someHash',
      transactionIndex: 12,
      removed: true,
      address: '0xasd',
      data: 'HelloDataHere',
      topics: ['0xa', '0xb'],
      transactionHash: 'hashControl',
      logIndex: 54
    }
    const statusSetFilter = {
      address: contractAddress,
      topics: [ethers.utils.id('VcStatusRemoved(address,address)')]
    }
    let returnData: ContractEventData
    vcStatusRegistry.onRemoveVcStatus.subscribe(async (e: ContractEventData) => {
      returnData = e
    })
    vcStatusRegistry.provider.emit(statusSetFilter, providerData)
    setTimeout(() => {
      assert.deepEqual(returnData, providerData)
    },1)
  })

  it('should forward the event when newBlock happens on the blockchain', async () => {
    let returnData: NewBlockData
    vcStatusRegistry.onNewBlock.subscribe(async (e: NewBlockData) => {
      returnData = e
    })
    vcStatusRegistry.provider.emit('block', 12)
    setTimeout(() => {
      assert.deepEqual(returnData, { blockNumber: 12 })
    },1)
  })
  it('should forward the error when it happens on the blockchain', async () => {
    let returnData: any
    vcStatusRegistry.onError.subscribe(async (e: any) => {
      returnData = e
    })
    vcStatusRegistry.provider.emit('error', { some: 'error' })
    setTimeout(() => {
      assert.deepEqual(returnData, { some: 'error' })
    },1)
  })

  it('return the current blockNumber when asked', async () => {
    sinon.stub(vcStatusRegistry.provider, 'getBlockNumber').returns(Promise.resolve(54))
    const blockNumber = await vcStatusRegistry.getBlockNumber()
    assert.equal(blockNumber, 54)
  })

})
