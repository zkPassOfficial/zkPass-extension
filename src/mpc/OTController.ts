import axios from 'axios'
import { assert, concatArray, getRandom, int2U8Array, parsePem } from '../utils'
import OTReceiver from './Receiver'
import OTDependencies from './OTDependencies'
import { NodeInfo } from './types'

enum InitState{
  RUNNING = 0,
  FINISH = 1
}

/**
 * implement mpc(2pc) used in the tls session
 */
export default class OTController {
  nodeInfo: NodeInfo
  nodeInstance: any
  count: number // ot count compute by text length
  receiver: OTReceiver
  dependencies: OTDependencies
  textBlocks: number
  circuits: [] //circuit => {gateBlobs, gateCount, andGateCount, wiresCount, inputSize }
  clientMsgEncKey?: CryptoKey
  nodeMsgDecKey?: CryptoKey
  initState?: InitState
  constructor(node: NodeInfo, circuits: [], textLength: number) {
    this.nodeInfo = node
    this.circuits = circuits
    this.textBlocks = Math.ceil(textLength / 16)
    this.dependencies = new OTDependencies(this.textBlocks)
    this.count = this.dependencies.count
    this.receiver = new OTReceiver(this.count)
  }

  async init() {
    try{
      if(this.initState === InitState.RUNNING) return

      this.initState = InitState.RUNNING

      this.nodeInstance = await this.createInstance(this.nodeInfo)

      const {pubKey, privateKey} = await this.generateKeypair()

      const connectResult= await this.fetchData('post', '/setup/connect', pubKey)

      if(!connectResult) return
      
      assert(connectResult.length === 129, 'connect node error')

      const {nodePubKey, nodeSign} =this.parseConnectResult(Array.from(connectResult))
      
      const {clientMsgEncKey, nodeMsgDecKey} =await this.generateMessageKeys(privateKey, nodePubKey)

      this.clientMsgEncKey = clientMsgEncKey
      this.nodeMsgDecKey = nodeMsgDecKey

      const pem = await this.loadPemFile('/test.pem')

      const nodeKey = parsePem(pem)

      assert(await this.verifyNodeKey(nodeKey, nodePubKey, nodeSign), 'You connected invalid node')
      
      //TODO: init gc worker

      console.log('start init ot')

      await this.receiver.init()// init sodium

      const [ pubKeySender, seedCommit ] = await this.receiver.keySetup()

      if(!pubKeySender || !seedCommit) throw('Generate receiver pub key fail')

      const keySetupResult = await this.fetchData('post', '/setup/ot/base', concatArray(int2U8Array(this.count, 4), pubKeySender, seedCommit)) 
      
      const {senderKeys, senderShare} = this.parseKeySetupResult(Array.from(keySetupResult))

      const [ encCols, seedShare, x, t ] =await this.receiver.extensionSetup(senderKeys, senderShare)

      const extensionResult = await this.fetchData('post', '/setup/ot/extension',
        concatArray(encCols, seedShare, x, t)) 

      assert(extensionResult[0] === 1, 'extension error')

      await this.nodeInstance.post('/blob', int2U8Array(this.textBlocks, 2))

      this.initState = InitState.FINISH
  
    }catch(err){
      console.log('OT Controller init error:', err)
      throw Error('OT Controller init error')
    }
    
  }
  
  async verifyNodeKey(nodeKey: Uint8Array, nodePubKey: Uint8Array, nodeSign: Uint8Array){
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw', nodeKey.buffer, 
        {name: 'ECDSA', namedCurve: 'P-256'}, true, [ 'verify' ])
  
      return await crypto.subtle.verify(
        {'name': 'ECDSA', 'hash': 'SHA-256'},
        cryptoKey,
        nodeSign.buffer,
        nodePubKey.buffer
      )
    }catch(error){
      console.log('error', error )
      return false
    }
    
  }

  async loadPemFile(filePath: string){
    try{
      const pem = await fetch(filePath)
      return pem.text()
    }catch(error){
      console.log('load pem file failed', error)
      throw('load pem file failed')
    }
  }

  async generateKeypair() {
    const keyPair = await crypto.subtle.generateKey({ 'name': 'ECDH', 'namedCurve': 'P-256' },true,[ 'deriveBits' ])

    const pubKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey)).slice(1)
    return {
      pubKey: pubKeyBytes as Uint8Array,
      privateKey: keyPair.privateKey
    }

  }

  async generateMessageKeys(privateKey: CryptoKey, nodePubKey: Uint8Array){

    const pubKey = await crypto.subtle.importKey('raw',nodePubKey.buffer,{name: 'ECDH', namedCurve: 'P-256'},true,[])

    const secret = await crypto.subtle.deriveBits({'name': 'ECDH', 'public': pubKey }, privateKey, 256)
    
    const enckey = await crypto.subtle.importKey('raw',secret.slice(0, 16),'AES-GCM', true, [ 'encrypt' ])

    const deckey = await crypto.subtle.importKey('raw',secret.slice(16, 32),'AES-GCM', true, [ 'decrypt' ])

    return {
      clientMsgEncKey: enckey,
      nodeMsgDecKey: deckey
    }
  }

  parseConnectResult(data: number[]){
    const pubKey = data.splice(0, 65)
    const sign = data.splice(0, 64)
    return { 
      nodePubKey: new Uint8Array(pubKey),
      nodeSign: new Uint8Array(sign)
    }
  }

  parseKeySetupResult(data: number[]){
    const senderKeys = data.slice(0, -16)
    const senderShare = data.slice(-16)
    return { 
      senderKeys: new Uint8Array(senderKeys),
      senderShare: new Uint8Array(senderShare)
    }
  }

  parseExtensionSetupResult(data: number[]){
    const senderKey = data.splice(0, 32 * 128)
    const senderShare = data.splice(0, 16)
    return { 
      senderKey: new Uint8Array(senderKey),
      senderShare: new Uint8Array(senderShare)
    }
  }

  parseGrableTableBlob(data: number){}

  async fetchData ( method:string, url: string, data:Uint8Array ){
    try{
      if(this.nodeInstance){
      
        const requestData = this.clientMsgEncKey? await this.encryptData(this.clientMsgEncKey, data): data.buffer
        
        const {data: responseData} = await this.nodeInstance[method](url, requestData)
        return this.nodeMsgDecKey? await this.decryptData(this.nodeMsgDecKey, new Uint8Array(responseData)): new Uint8Array(responseData)
      }
  
    }catch (e){
      throw `connect node error: ${JSON.stringify(e)}`
    }
    
    return new Uint8Array()
  }

  async createInstance(node: NodeInfo) {
    return axios.create({
      baseURL: `http://${node.ip}:${node.port}`,
      timeout: 10 * 1000,
      responseType: 'arraybuffer',
      headers: { 
        'tid': node.tid,
        'Access-Control-Allow-Origin': '*' 
      }
    })
  }

  async encryptData(enckey: CryptoKey, data: Uint8Array){    
    try{
      const IV = getRandom(12)
      const enc = await crypto.subtle.encrypt(
        {name: 'AES-GCM', iv: IV.buffer},
        enckey,
        data.buffer)

      return concatArray(IV, new Uint8Array(enc))
    } catch(err){
      throw('Encrypting data Error')
    }
  }

  async decryptData (deckey: CryptoKey, data: Uint8Array){
    try{
      return new Uint8Array(await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: data.slice(0, 12).buffer},
        deckey,
        data.slice(12).buffer))
    } catch (err){
      throw('Decrypting data Error')
    }
  }

}