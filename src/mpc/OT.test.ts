import { describe, expect, test } from '@jest/globals'
import Receiver from './Receiver'
import Sender from './Sender'

describe('Test OT', () => {

  const receiver = new Receiver(1)
  const sender = new Sender(1)

  test('generate keys', async () => {
    await receiver.init()
    await sender.init()
    const [ pubKey, seed ] = await receiver.keySetup()

    expect(pubKey).not.toEqual(undefined)
    expect(seed).not.toEqual(undefined)

    const [ senderPubKey, senderSheedShare ] = await sender.keySetup(pubKey as Uint8Array, seed as Uint8Array)

    const extensionResult = await receiver.extensionSetup(senderPubKey, senderSheedShare)

    expect(extensionResult).not.toEqual(undefined)

    const [ encCols, seedShare, x, t ] = extensionResult || []

    await sender.extensionSetup(encCols, seedShare, x, t)

    //async message send and parse
    // const send = receiver.send(new Uint8Array(128).fill(0))

    // expect(send.length == 18)

    // const receive = receiver.receive(new Uint8Array(128).fill(0), new Uint8Array(128 * 32).fill(0))

    // expect(receive.length == 2048)

  })
})