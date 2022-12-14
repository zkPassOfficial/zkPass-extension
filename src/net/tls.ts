import { getRandom, sleep ,loadRes, b64decode,str2U8Array} from '../utils'
import { uint2bytesBE ,bytes2BigInt,hex2Bytes,bytes2Hex} from '../utils/numeric'
import Tcp from './tcp'
import Buffer from '../utils/buffer'
import * as asn1js from 'asn1js'
import {Certificate, CertificateChainValidationEngine} from 'pkijs'
import {hmac,Hash} from '../crypto/sha256'
import { bytes2str,str2bytes } from '../utils/string'
import { ec as ECC } from 'elliptic'


const RecordSchema = {
  Version : 0x0303,//tls 1.2
  CompressionMethod : {
    NONE: 0,
    DEFLATE: 1
  },
  ContentType :{
    CHANGE_CIPHER_SPEC: 20,
    ALERT: 21,
    HANDSHAKE: 22,
    APPLICATION_DATA: 23,
    HEARTBEAT: 24
  },
  HandshakeType : {
    HELLO_REQUEST:0,
    CLIENT_HELLO: 1,
    SERVER_HELLO: 2,
    CLIENT_KEY_EXCHANGE: 16,
    CERTIFICATE: 11,
    SERVER_KEY_EXCHANGE: 12,
    SERVER_HELLO_DONE: 14,
    FINISHED: 20
  },
  CipherSuites:{
    TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:0xc02f
  },
}

const Step = {
  ERR:-1,
  CLOSED:0,
  CLIENT_HELLO:1,
  SERVER_HELLO:2,
  CLIENT_FINISH:3,
  SERVER_FINISH:4,
  APPLICATION_DATA:5
}

const RECORD_HEADER_LEN = 5
const HANDSHAKE_HEADER_LEN = 4

/*
 * A Typescript implementation of TLS.
 *
 * =======================FULL HANDSHAKE======================
 * Client                                               Server
 *
 * ClientHello                  -------->
 *                                                 ServerHello
 *                                                Certificate*
 *                                          ServerKeyExchange*
 *                                         CertificateRequest*
 *                              <--------      ServerHelloDone
 * Certificate*
 * ClientKeyExchange
 * CertificateVerify*
 * [ChangeCipherSpec]
 * Finished                     -------->
 *                                          [ChangeCipherSpec]
 *                              <--------             Finished
 * Application Data             <------->     Application Data
 *
 * =====================SESSION RESUMPTION=====================
 * Client                                                Server
 *  
 * ClientHello(sessionId)        -------->
 *                                       ServerHello(sessionId)
 *                                           [ChangeCipherSpec]
 *                               <--------             Finished
 * [ChangeCipherSpec]
 * Finished                      -------->
 * Application Data              <------->     Application Data
*/


class HandshakeData {
  bytes = new Buffer()
  clientRandom = new Uint8Array()
  serverRandom = new Uint8Array()
  serverPubkey = new Uint8Array()
  received = new Map()
}


export default class Tls {

  appId: string
  host: string
  port: number
  tcp: Tcp
 
  //received records
  records = new Array<any>()
  handshake = new HandshakeData()
  step = Step.CLOSED
  
  constructor(appId: string, host: string, port: number) {
    this.appId = appId
    this.host = host
    this.port = port

    this.tcp = new Tcp(appId, host, port)
  }

  //pseudo random function
  prf(key:Uint8Array,seed:Uint8Array){
    const a1 = hmac(key,seed)
    const a2 = hmac(key,a1)
    const p1 = hmac(key,new Uint8Array([ ...a1,...seed ]))
    const p2 = hmac(key,new Uint8Array([ ...a2,...seed ]))
    return new Uint8Array([ ...p1,...p2 ])
  }

  getMasterSecret(pms:Uint8Array,client_random:Uint8Array,server_random:Uint8Array){
    const seed_buf = new Buffer()
    seed_buf.writeBytes(str2U8Array('master secret'))
    seed_buf.writeBytes(client_random)
    seed_buf.writeBytes(server_random)
    const seed = seed_buf.drain()
    const key_block = this.prf(pms,seed)
    return key_block.slice(0,48)
  }

  getKeys(ms:Uint8Array,client_random:Uint8Array,server_random:Uint8Array){
    const seed_buf = new Buffer()
    seed_buf.writeBytes(str2U8Array('key expansion'))
    seed_buf.writeBytes(server_random)
    seed_buf.writeBytes(client_random)
    const seed = seed_buf.drain()

    const key_block = this.prf(ms,seed)
    const client_mac_key = key_block.slice(0,32)
    const server_mac_key = key_block.slice(32,64)
    const client_write_key = key_block.slice(64,80)
    const server_write_key = key_block.slice(80,96)
    return [ client_mac_key,server_mac_key,client_write_key,server_write_key ]
  }

  getVerifyData(ms:Uint8Array,handshake_hash:Uint8Array){
    const seed_buf = new Buffer()
    seed_buf.writeBytes(str2U8Array('client finished'))
    seed_buf.writeBytes(handshake_hash)
    const seed = seed_buf.drain()
    const a1 = hmac(ms,seed)
    const p1 = hmac(ms,new Uint8Array([ ...a1,...seed ]))
    const verify_data = p1.slice(0,12)
    return verify_data
  }

  getMac(fragment:Uint8Array,client_mac_key:Uint8Array){
    const buf = new Buffer()
    buf.writeUint64(0)//sequence number
    buf.writeUint8(0x16)//record type: handshake
    buf.writeUint16(0x0303)//version tlsv1.2
    buf.writeUint16(0x10)//fragment length
    buf.writeBytes(fragment)//12
    const data = buf.drain()
    return hmac(client_mac_key,data)
  }


  createClientHello() {
    this.handshake.clientRandom = getRandom(32)

    const supported_groups_extension = new Uint8Array([
      0x00, 0x0a, // Type supported_groups
      0x00, 0x04, // Length
      0x00, 0x02, // Supported Groups List Length
      0x00, 0x17, // Supported Group: secp256r1
    ])

    const signature_algorithm_extension = new Uint8Array([
      0x00, 0x0d, // Type signature_algorithms
      0x00, 0x04, // Length
      0x00, 0x02, // Signature Hash Algorithms Length
      0x04, 0x01, // Signature Algorithm: rsa_pkcs1_sha256 (0x0401)
    ])

    const server_name = str2bytes(this.host)
    const server_name_extension = new Uint8Array([
      0x00, 0x00, // Extension type: server_name
      ...uint2bytesBE(server_name.length + 5, 2), // Length
      ...uint2bytesBE(server_name.length + 3, 2), // Server Name List Length
      0x00, // Type: host name
      ...uint2bytesBE(server_name.length, 2), // Server Name Length
      ...server_name,
    ])

    const extensions_len
      = supported_groups_extension.length
      + signature_algorithm_extension.length
      + server_name_extension.length

    const buf = new Buffer()

    buf.writeUint8(0x01) // Handshake type: Client Hello
    buf.writeUint24(extensions_len + 43) // Length
    buf.writeUint16(0x0303)// Version: TLS 1.2
    buf.writeBytes(this.handshake.clientRandom)// Client random

    buf.writeUint8(0x00)// Session ID Length
    buf.writeUint16(0x02)// Cipher Suites Length
    // buf.writeUint16(0xc02f)// Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    buf.writeUint16(0xc027) //Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256

    buf.writeUint8(0x01)// Compression Methods Length
    buf.writeUint8(0x00)// Compression Methods: null

    buf.writeUint16(extensions_len)
    buf.writeBytes(supported_groups_extension)
    buf.writeBytes(signature_algorithm_extension)
    buf.writeBytes(server_name_extension)

    const clientHello = buf.peekBytes(0,buf.offset)

    this.handshake.bytes = buf

    const record_header = new Uint8Array([
      0x16, // Type: Handshake
      0x03, 0x03, // Version: TLS 1.2
      ...uint2bytesBE(clientHello.length, 2) // Length
    ])

    const record = [ ...record_header, ...clientHello ]

    return record
  }
  
  createClientFinished(pubkey:Uint8Array,encrypted_handshake_message:Uint8Array,tag:Uint8Array) {

    // client key exchange
    const cke_buf = new Buffer()
    cke_buf.writeUint8(0x10) // Handshake type: Client Key Exchange
    cke_buf.writeUint24(0x21) // Length
    cke_buf.writeUint16(0x20) // Pubkey Length: 32
    cke_buf.writeBytes(pubkey) //pubkey
    const cke_bytes = cke_buf.drain()
    this.handshake.bytes.writeBytes(cke_bytes)

    const record_buf = new Buffer()

    // write client key exchange record
    record_buf.writeBytes(new Uint8Array([ 0x16, 0x03, 0x03, 0x00, 0x46 ]))// record header(Type: Handshake, Version: TLS 1.2, Length) 
    record_buf.writeBytes(cke_bytes) // client key exchange
    
    // write change cipher spec record
    record_buf.writeBytes(new Uint8Array([ 0x14, 0x03, 0x03, 0x00, 0x01, 0x01 ]))

    // write client finished record
    record_buf.writeUint8(0x16)
    record_buf.writeUint16(0x0303)
    record_buf.writeUint16(0x50)
    record_buf.writeBytes(encrypted_handshake_message)
    record_buf.writeBytes(tag)

    return record_buf.drain()
  }

  async sendClientHello() {
    const record = this.createClientHello()
    const socketId = await this.connect()

    this.step = Step.CLIENT_HELLO
    const sendRes = await this.send(record)

    this.step = Step.SERVER_HELLO
    await this.receiveRecords()
    this.step = Step.CLIENT_FINISH

    const pubkeyBytes = this.handshake.serverPubkey
    const half = (pubkeyBytes.length - 1) / 2
    console.log('bytes',pubkeyBytes)
    const xBytes = pubkeyBytes.slice(1, half+1)
    const yBytes = pubkeyBytes.slice(half + 1, pubkeyBytes.length)
    // const x = bytes2BigInt(xBytes)
    // const y = bytes2BigInt(yBytes)
    const x = bytes2Hex(xBytes)
    const y = bytes2Hex(yBytes)


    const hasher = new Hash()
    hasher.update(this.handshake.bytes.drain())//todo
    const handshake_hash = hasher.digest()
    
    const ec = new ECC('p256')
    const client_key = ec.genKeyPair()
    const client_private_key = client_key.getPrivate()
    // const client_public_key = client_key.getPublic()

    const server_ec = new ECC('p256')
    const server_public_key = server_ec.keyFromPublic({ x, y }, 'hex').getPublic()
    const pms = server_public_key.mul(client_private_key).getX()

    const ms = this.getMasterSecret(str2bytes(pms.toString()),this.handshake.clientRandom,this.handshake.serverRandom)
    const [ client_mac_key, server_mac_key, client_write_key, server_write_key ] = this.getKeys(ms,this.handshake.clientRandom,this.handshake.serverRandom)
    const iv = getRandom(16)
    const verify_data = this.getVerifyData(ms,handshake_hash)
    const tag = this.getMac(verify_data,client_mac_key)

    const generic_block_cipher_buf = new Buffer()
    generic_block_cipher_buf.writeBytes(iv)
    generic_block_cipher_buf.writeUint8(22)
    generic_block_cipher_buf.writeUint24(12)
    generic_block_cipher_buf.writeBytes(verify_data)
    generic_block_cipher_buf.writeBytes(tag)
  
    const padding = new Uint8Array(15).fill(15)
    generic_block_cipher_buf.writeBytes(padding)
    generic_block_cipher_buf.writeUint8(15)
  
    const generic_block_cipher = generic_block_cipher_buf.drain()
  
    const clientFinishRecords = this.createClientFinished(this.handshake.serverPubkey,generic_block_cipher,tag)
    this.send([ ...clientFinishRecords ])
  }

  stepFinished(){
    console.log('check finished',this.step,this.records.length)
    switch (this.step) {
      case Step.SERVER_HELLO:
        //server hello & certificate & server key exchange & server hello done 
        return this.handshake.received.size == 4
      case Step.SERVER_FINISH:
        return this.records.length==7
      default:
        return false
    }
  }

  async verifyCertificate(certs:Certificate[]){

    const trustedCerts = await this.loadTrustStore()

    //todo check ocsp & crls
    const chainEngine = new CertificateChainValidationEngine({
      certs,
      trustedCerts,
      checkDate: new Date()
    })
  
    const valid = await chainEngine.verify()
    if(valid.result == false){
      throw valid.resultMessage
    }
  }

  async parseHandshake(buf: Buffer){

    const header = {
      type: buf.readUint8(),
      length: buf.readUint24(),
    }

    let data
    
    switch (header.type) {
      case RecordSchema.HandshakeType.SERVER_HELLO:
        { 
          const version = buf.readUint16()
          const serverRandom = buf.readBytes(32)

          this.handshake.serverRandom = serverRandom

          const sessionIdLength = buf.readUint8()
          let sessionId
          if(sessionIdLength > 0){
            sessionId = buf.readBytes(sessionIdLength)
          }
          const cipherSuite = buf.readUint16()
          const compressionMethod = buf.readUint8()
          const extensionsLength = buf.readUint16()

          data = {
            version,
            serverRandom,
            sessionIdLength,
            sessionId,
            cipherSuite,
            compressionMethod,
            extensionsLength,
          }
          buf.seek(buf.cursor+data.extensionsLength)
        }
        break
      case RecordSchema.HandshakeType.CERTIFICATE:
        { 
          let cert_eof = 0
          const certificates = []
          const certificatesLength = buf.readUint24()
          const certHeaderLen = 3

          while (cert_eof<certificatesLength) {
            const certLen = buf.readUint24()
            const der = buf.readBytes(certLen)
            const asn1 = asn1js.fromBER(der.buffer)
            const cert = new Certificate({ schema: asn1.result })
            certificates.push(cert)
            cert_eof += certHeaderLen + certLen
          }

          await this.verifyCertificate(certificates)
          data = {
            certificatesLength,
            certificates
          }
        }
        break
      case RecordSchema.HandshakeType.SERVER_KEY_EXCHANGE:
        {
          const curveType = buf.readUint8()
          const namedCurve = buf.readUint16()
          const pubkeyLength = buf.readUint8()
          const namedCurveCompressed = buf.peekUint8(buf.cursor) === 0x04
          if(namedCurveCompressed){
            throw 'we are not support compressed named curve for now!'
            //todo support it!
          }
          const pubkey = buf.readBytes(pubkeyLength)
          this.handshake.serverPubkey = pubkey
          const signatureAlgorithm = buf.readUint16() //hash & signature
          const signatureLength = buf.readUint16()
          const signature = buf.readBytes(signatureLength)
          data = {
            curveType,namedCurve,pubkeyLength,pubkey,signatureAlgorithm,signatureLength,signature
          }
        }
        break
      case RecordSchema.HandshakeType.SERVER_HELLO_DONE:
        data = {}
        //nothing in server hello done.
        break
      default:
        throw(`unknown handshake type ${header.type} !`)
    }

    this.handshake.received.set(header.type, data)
    console.log('handshake',header,data)
    return {header,data}
  }

  async parseRecord(buf: Buffer){

    const header = {
      type:buf.readUint8(),
      version:buf.readUint16(),
      length:buf.readUint16()
    }

    //todo check min length and version and type
    if(header.version != 0x0303){
      throw('unsupported version')
    }

    let content

    if(header.type === RecordSchema.ContentType.HANDSHAKE){
      content = await this.parseHandshake(buf)
      this.handshake.bytes.writeBytes(buf.peekBytes(5, HANDSHAKE_HEADER_LEN + content.header.length))
    }else{
      throw('not implemented now!')
    }

    const record = {
      header,
      content
    }
    return record
  }
  
  async parse() {
    console.log('parse')

    const bufferOffset = this.tcp.buffer.offset

    if (this.tcp.buffer.peekUint16(0) === 0x1503) {
      throw ('Server Alert.')
    }

    if (bufferOffset >= RECORD_HEADER_LEN) {
      const contentLength = this.tcp.buffer.peekUint16(3)
      const recordLength = RECORD_HEADER_LEN + contentLength

      if(recordLength<=bufferOffset) {
        const recordBuf = this.tcp.buffer.shift(recordLength)
        const record = await this.parseRecord(recordBuf)
        console.log('parsed record',record)
        this.records.push(record)
      }
    }
  }

  async receiveRecords(){
    //todo timeout
    while (!this.stepFinished()){
      // console.log('loop',this.tcp.buffer.bytes,this.tcp.buffer.offset)
      await this.parse()
      await sleep(1000)
    }
    console.log('received',this.step,this.records)

    //todo check records
    //tls version
    //certificate
    //min record len...
    //Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 [0xc0, 0x2f]
    //all handshake signature
  }

  async loadTrustStore(){
    const truststore = await loadRes('/truststore.txt')
    const rootCAs = truststore.replace(/\r\n/g,'').split(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----}?/g).filter(it => it.length > 0)
      
    const trustedCerts = new Array<Certificate>()
  
    rootCAs.forEach(it => {
      const der = b64decode(it)
      const asn1 = asn1js.fromBER(der.buffer)
      const cert = new Certificate({ schema: asn1.result })
      trustedCerts.push(cert)
    })

    return trustedCerts
  }

  async connect(){
    const socketId = await this.tcp.connect()
    return socketId
  }

  async send(data:Array<any>){
    const sendRes = await this.tcp.send(data)
    return sendRes
  }

  async close(){
    await this.tcp.close()
  }

}