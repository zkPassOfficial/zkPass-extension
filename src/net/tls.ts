import { getRandom, sleep } from '../utils'
import { uint2bytesBE } from '../utils/numeric'
import { str2bytes } from '../utils/string'
import Tcp from './tcp'
import Buffer from '../utils/buffer'
import { concat } from '../utils/typedarray'

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
    HELLO_REQUEST: 0,
    CLIENT_HELLO: 1,
    SERVER_HELLO: 2,
    CERTIFICATE: 11,
    SERVER_KEY_EXCHANGE: 12,
    CERTIFICATE_REQUEST: 13,
    SERVER_HELLO_DONE: 14,
    CERTIFICATE_VERIFY: 15,
    CLIENT_KEY_EXCHANGE: 16,
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

/**
 * A typical handshake (from the client's perspective).
 *
 * 1. Client sends ClientHello.
 * 2. Client receives ServerHello.
 * 3. Client receives Certificate*.
 * 4. Client receives ServerKeyExchange*.
 * 5. Client receives ServerHelloDone.
 * 6. Client sends Certificate*.
 * 7. Client sends ClientKeyExchange.
 * 8. Client sends CertificateVerify*.
 * 9. Client sends ChangeCipherSpec.
 * 10. Client sends Finished.
 * 11. Client receives ChangeCipherSpec.
 * 12. Client receives Finished.
 * 13. Client sends/receives application data.
 *
 * To reuse an existing session:
 *
 * 1. Client sends ClientHello with session ID for reuse.
 * 2. Client receives ServerHello with same session ID if reusing.
 * 3. Client receives ChangeCipherSpec message if reusing.
 * 4. Client receives Finished.
 * 5. Client sends ChangeCipherSpec.
 * 6. Client sends Finished.
 *
 */
export default class Tls {

  appId: string
  host: string
  port: number
  tcp: Tcp
  clientRandom: Uint8Array
  clientHello: Uint8Array
 
  //received records
  records = []
  step = Step.CLOSED
  
  constructor(appId: string, host: string, port: number) {
    this.appId = appId
    this.host = host
    this.port = port

    this.tcp = new Tcp(appId, host, port)
    this.clientRandom = new Uint8Array(0)
    this.clientHello = new Uint8Array(0)
  }

  createClientHello() {
    this.clientRandom = getRandom(32)

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

    const buffer = new Buffer()

    buffer.writeUint8(0x01) // Handshake type: Client Hello
    buffer.writeUint24(extensions_len + 43) // Length
    buffer.writeUint16(0x0303)// Version: TLS 1.2
    buffer.writeBytes(this.clientRandom)// Client random

    buffer.writeUint8(0x00)// Session ID Length
    buffer.writeUint16(0x02)// Cipher Suites Length
    buffer.writeUint16(0xc02f)// Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256

    buffer.writeUint8(0x01)// Compression Methods Length
    buffer.writeUint8(0x00)// Compression Methods: null

    buffer.writeUint16(extensions_len)
    buffer.writeBytes(supported_groups_extension)
    buffer.writeBytes(signature_algorithm_extension)
    buffer.writeBytes(server_name_extension)

    this.clientHello = buffer.drain()

    const record_header = new Uint8Array([
      0x16, // Type: Handshake
      0x03, 0x03, // Version: TLS 1.2
      ...uint2bytesBE(this.clientHello.length, 2) // Length
    ])

    const record = concat(record_header, this.clientHello)

    return record
  }

  async sendClientHello() {
    const record = this.createClientHello()
    const socketId = await this.tcp.connect()
    this.step = Step.CLIENT_HELLO
    await this.tcp.send(Array.from(record))
    this.step = Step.SERVER_HELLO
    await this.receiveRecords()
    console.log(this.step,this.records)
    this.step = Step.CLIENT_FINISH
  }

  stepFinished(){
    switch (this.step) {    
      case Step.SERVER_HELLO:
        //should has 4 records (Server Hello, Certificate, Server Key Exchange, Server Hello Done)
        return this.records.length==4
      case Step.SERVER_FINISH:
        return this.records.length==3
      default:
        return false
    }
  }

  async receiveRecords(){
    //todo timeout
    while (!this.stepFinished()){
      this.parseRecord()
      await sleep(20)
    }
  }

  // Parse Server Hello, Certificate, Server Key Exchange, Server Hello Done
  async parseRecord() {

    const buffer = this.tcp.buffer

    if (buffer.peekUint16(0) === 0x1503) {
      throw ('Server Alert.')
    }

    if (buffer.offset >= RECORD_HEADER_LEN) {
      const contentLength = buffer.peekUint16(3)
      const recordLength = RECORD_HEADER_LEN + contentLength

      if(recordLength<=buffer.offset){
        //todo 
      }

      // const header = {
      //   contentType:buffer.readUint8(),
      //   version:buffer.readUint16(),
      //   length:buffer.readUint16()
      // }
    }
  }

}