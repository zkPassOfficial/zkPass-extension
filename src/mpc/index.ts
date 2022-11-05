import axios from 'axios'
import { int2U8Array } from '../utils'
import OTReceiver from './Receiver'
import OTSender from './Sender'
import { NodeInfo } from './types'

/**
 * implement mpc(2pc) used in the tls session
 */
export default class MPCControler {
  nodeInfo: NodeInfo
  nodeInstance: any
  count: number // ot count compute by text length
  sender: OTSender
  senderCount = 0
  receiver: OTReceiver
  receiverCount: number
  constructor(node: NodeInfo, textLength: number) {
    this.nodeInfo = node
    this.count = Math.ceil(textLength / 16)
    this.receiverCount = this.count
    const totalCount = 1

    this.sender = new OTSender(this.count)
    this.receiver = new OTReceiver(this.count)
  }

  async init() {
    this.nodeInstance = await this.connectToNode(this.nodeInfo)

    if (!await this.pingNode()) {
      throw Error('can not connect to node')
    }

    //TODO: init gc worker
    const [pubKeySender, seedCommit] = await this.receiver.keySetup()
    const [pubKeyBytes, privateKey] = await this.generateKeypair()
    //init1
    const [] = await this.nodeInstance.get('/setup', [
      pubKeyBytes,
      int2U8Array(this.count, 2),
      int2U8Array(this.receiverCount, 4),
      int2U8Array(this.senderCount, 2),
    ])

    //getBlob
    await this.nodeInstance.post('/blob', {})


  }

  async generateKeypair() {
    const keyPair = await crypto.subtle.generateKey(
      { 'name': 'ECDH', 'namedCurve': 'P-256' },
      true,
      ['deriveBits'])

    const pubKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey)).slice(1)

    return [pubKeyBytes, keyPair.privateKey]
  }

  async pingNode() {
    if (this.nodeInstance) {
      return await this.nodeInstance.get('/ping')
    }
    return false
  }

  async connectToNode(node: NodeInfo) {
    return axios.create({
      baseURL: `http://${node.ip}:${node.port}`,
      timeout: 10 * 1000,
      headers: { 'session-id': 'xxxx' }
    })
  }

}