import { str2U8Array, int2U8Array, getRandom } from '../utils'
import Tcp from './tcp'

export default class Tls {

  appId: string
  host: string
  port: number
  tcp: Tcp

  buffer: Uint8Array
  clientRandom: Uint8Array
  clientHello: Uint8Array

  constructor(appId: string, host: string, port: number) {
    this.appId = appId
    this.host = host
    this.port = port

    this.buffer = new Uint8Array()
    this.tcp = new Tcp(appId, host, port)

    this.tcp.on('data', data => {
      const buffer = new Uint8Array(this.buffer.length + data.length)
      buffer.set(this.buffer, 0)
      buffer.set(data, this.buffer.length)
      this.buffer = buffer
    })
    this.clientRandom = new Uint8Array()
    this.clientHello = new Uint8Array()
  }

  createClientHello() {
    const supported_groups_extension = [
      0x00, 0x0a, // Type supported_groups
      0x00, 0x04, // Length
      0x00, 0x02, // Supported Groups List Length
      0x00, 0x17, // Supported Group: secp256r1
    ]

    const signature_algorithm_extension = [
      0x00, 0x0d, // Type signature_algorithms
      0x00, 0x04, // Length
      0x00, 0x02, // Signature Hash Algorithms Length
      0x04, 0x01, // Signature Algorithm: rsa_pkcs1_sha256 (0x0401)
    ]

    const server_name = str2U8Array(this.host)
    const server_name_extension = [
      0x00, 0x00, // Extension type: server_name
      ...int2U8Array(server_name.length + 5, 2), // Length
      ...int2U8Array(server_name.length + 3, 2), // Server Name List Length
      0x00, // Type: host name
      ...int2U8Array(server_name.length, 2), // Server Name Length
      ...server_name,
    ]

    const extensions_len
      = supported_groups_extension.length
      + signature_algorithm_extension.length
      + server_name_extension.length

    this.clientRandom = getRandom(new Uint8Array(32))

    const client_hello = [
      0x01, // Handshake type: Client Hello
      ...int2U8Array(extensions_len + 43, 3), // Length
      0x03, 0x03, // Version: TLS 1.2
      ...this.clientRandom, // Client random
      0x00, // Session ID Length
      0x00, 0x02, // Cipher Suites Length
      0xc0, 0x2f, // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
      0x01, // Compression Methods Length
      0x00, // Compression Method: null
      ...int2U8Array(extensions_len, 2),
      ...supported_groups_extension,
      ...signature_algorithm_extension,
      ...server_name_extension
    ]

    this.clientHello = new Uint8Array(client_hello)

    const record_header = [
      0x16, // Type: Handshake
      0x03, 0x03, // Version: TLS 1.2
      ...int2U8Array(client_hello.length, 2) // Length
    ]

    const record = new Uint8Array([ ...record_header, ...client_hello ])

    return record
  }
}