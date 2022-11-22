import {loadRes, b64decode,getRandom,str2U8Array, u8Array2Str} from '../utils/index'
import * as asn1js from 'asn1js'
import {Certificate, CertificateChainValidationEngine} from 'pkijs'
import { ec as ECC } from 'elliptic'
import Buffer from '../utils/buffer'

import { bytes2str } from '../utils/string'
import { hex2Bytes,bytes2Hex } from '../utils/numeric'
import {hmac} from '../crypto/sha256'


export async function testCert(){
  console.log('temp')
  const truststore = await loadRes('/truststore.txt')
  const rootCAs = truststore.replace(/\r\n/g,'').split(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----}?/g).filter(it => it.length > 0)
    
  const trustedCerts = new Array<Certificate>()

  rootCAs.forEach(it => {
    const der = b64decode(it)
    const asn1 = asn1js.fromBER(der.buffer)
    const cert = new Certificate({ schema: asn1.result })
    trustedCerts.push(cert)
  })

  const rootPem = 'MIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQUFADBhMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBDQTAeFw0wNjExMTAwMDAwMDBaFw0zMTExMTAwMDAwMDBaMGExCzAJBgNVBAYTAlVTMRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5jb20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4jvhEXLeqKTTo1eqUKKPC3eQyaKl7hLOllsBCSDMAZOnTjC3U/dDxGkAV53ijSLdhwZAAIEJzs4bg7/fzTtxRuLWZscFs3YnFo97nh6Vfe63SKMI2tavegw5BmV/Sl0fvBf4q77uKNd0f3p4mVmFaG5cIzJLv07A6Fpt43C/dxC//AH2hdmoRBBYMql1GNXRor5H4idq9Joz+EkIYIvUX7Q6hL+hqkpMfT7PT19sdl6gSzeRntwi5m3OFBqOasv+zbMUZBfHWymeMr/y7vrTC0LUq7dBMtoM1O/4gdW7jVg/tRvoSSiicNoxBN33shbyTApOB6jtSj1etX+jkMOvJwIDAQABo2MwYTAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUA95QNVbRTLtm8KPiGxvDl7I90VUwHwYDVR0jBBgwFoAUA95QNVbRTLtm8KPiGxvDl7I90VUwDQYJKoZIhvcNAQEFBQADggEBAMucN6pIExIK+t1EnE9SsPTfrgT1eXkIoyQY/EsrhMAtudXH/vTBH1jLuG2cenTnmCmrEbXjcKChzUyImZOMkXDiqw8cvpOp/2PV5Adg06O/nVsJ8dWO41P0jmP6P6fbtGbfYmbW0W5BjfIttep3Sp+dWOIrWcBAI+0tKIJFPnlUkiaY4IBIqDfv8NZ5YBberOgOzW6sRBc4L0na4UU+Krk2U886UAb3LujEV0lsYSEY1QSteDwsOoBrp+uvFRTp2InBuThs4pFsiv9kuXclVzDAGySj4dzp30d8tbQkCAUw7C29C79Fv1C5qfPrmAESrciIxpg0X40KPMbp1ZWVbd4='
  const rootBytes = b64decode(rootPem)
  const asn1Root = asn1js.fromBER(rootBytes.buffer)
  const certRoot = new Certificate({ schema: asn1Root.result })
  console.log('certRoot',certRoot)

  const hexIntermediate='308204be308203a6a003020102021006d8d904d5584346f68a2fa754227ec4300d06092a864886f70d01010b05003061310b300906035504061302555331153013060355040a130c446967694365727420496e6331193017060355040b13107777772e64696769636572742e636f6d3120301e06035504031317446967694365727420476c6f62616c20526f6f74204341301e170d3231303431343030303030305a170d3331303431333233353935395a304f310b300906035504061302555331153013060355040a130c446967694365727420496e633129302706035504031320446967694365727420544c53205253412053484132353620323032302043413130820122300d06092a864886f70d01010105000382010f003082010a0282010100c14bb3654770bcdd4f58dbec9cedc366e51f311354ad4a66461f2c0aec6407e52edcdcb90a20eddfe3c4d09e9aa97a1d8288e51156db1e9f58c251e72c340d2ed292e156cbf1795fb3bb87ca25037b9a52416610604f571349f0e8376783dfe7d34b674c2251a6df0e9910ed57517426e27dc7ca622e131b7f238825536fc13458008b84fff8bea75849227b96ada2889b15bca07cdfe951a8d5b0ed37e236b4824b62b5499aecc767d6e33ef5e3d6125e44f1bf71427d58840380b18101faf9ca32bbb48e278727c52b74d4a8d697dec364f9cace53a256bc78178e490329aefb494fa415b9cef25c19576d6b79a72ba2272013b5d03d40d321300793ea99f50203010001a38201823082017e30120603551d130101ff040830060101ff020100301d0603551d0e04160414b76ba2eaa8aa848c79eab4da0f98b2c59576b9f4301f0603551d2304183016801403de503556d14cbb66f0a3e21b1bc397b23dd155300e0603551d0f0101ff040403020186301d0603551d250416301406082b0601050507030106082b06010505070302307606082b06010505070101046a3068302406082b060105050730018618687474703a2f2f6f6373702e64696769636572742e636f6d304006082b060105050730028634687474703a2f2f636163657274732e64696769636572742e636f6d2f4469676943657274476c6f62616c526f6f7443412e63727430420603551d1f043b30393037a035a0338631687474703a2f2f63726c332e64696769636572742e636f6d2f4469676943657274476c6f62616c526f6f7443412e63726c303d0603551d2004363034300b06096086480186fd6c02013007060567810c01013008060667810c0102013008060667810c0102023008060667810c010203300d06092a864886f70d01010b050003820101008032ce5e0bdd6e5a0d0aafe1d684cbc08efa8570edda5db30cf72b7540fe850afaf33178b7704b1a8958ba80bdf36b1de97ecf0bba589c59d490d3fd6cfdd0986db771825bcf6d0b5a09d07bdec443d82aa4de9e41265fbb8f99cbddaee1a86f9f87fe74b71f1b20abb14fc6f5675d5d9b3ce9ff69f7616cd6d9f3fd36c6ab038876d24b2e7586e3fcd8557d26c21177df3e02b67cf3ab7b7a86366fb8f7d89371cf86df7330fa7babed2a59c842843b11171a52f3c90e147da25b7267ba71ed574766c5b8024a65345e8bd02a3c209c51994ce7529ef76b112b0d927e1de88aeb36164387ea2a63bf753febdec403bb0a3cf730efebaf4cfc8b3610733ef3a4'
  const intermediateBuffer = new Buffer()

  for (let j = 0; j < hexIntermediate.length; j=j+2) {
    const num = parseInt(`0x${hexIntermediate[j]}${hexIntermediate[j+1]}`)
    intermediateBuffer.writeUint8(num)
  }
  const derIntermediate = intermediateBuffer.drain()

  const asn1Intermediate = asn1js.fromBER(derIntermediate)
  const certIntermediate = new Certificate({ schema: asn1Intermediate.result })
  console.log('certIntermediate',certIntermediate)

  const hexLeaf = '308206bb308205a3a00302010202100d46b383d8f8435d4abff9be6b9eed81300d06092a864886f70d01010b0500304f310b300906035504061302555331153013060355040a130c446967694365727420496e633129302706035504031320446967694365727420544c532052534120534841323536203230323020434131301e170d3232303432303030303030305a170d3233303432303233353935395a3066310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d53616e204672616e636973636f31153013060355040a130c4769744875622c20496e632e311330110603550403130a6769746875622e636f6d30820122300d06092a864886f70d01010105000382010f003082010a02820101009e633165409d6d344f1f2e87ca650ad95c75edb5fd343540258b4e6af223b570d1d3a0ffda82c271938a60280046fb8f93cdc8e07b3aada637d6037d07109504955278b2ce6794aacde4db87124ae859227b7a52da2878edba9ba7ce06fc52ba94f9527227a8a27aa010209035fd37b2a543b3028df3c95a555fca16b7a7852f6944927f9d72a89ccbe6e63ff3d4e63bd58b4b5b436402d24f37b691ca8da871ac7f7b7f45e759a50670f8aa3ee12d551930b14aa20890c45f4dd2b0e488dda7d45c88a84c358571c67b9cfef5954558c5d76f3821e3f994481da9f9cb16461fa939a797172a94276ffd157026011fb12ad85a9792eea9f1c1f834b2d85f16170203010001a382037a30820376301f0603551d23041830168014b76ba2eaa8aa848c79eab4da0f98b2c59576b9f4301d0603551d0e0416041443ae5254168e1a8195ac2f6ea399dc5322569f8f30250603551d11041e301c820a6769746875622e636f6d820e7777772e6769746875622e636f6d300e0603551d0f0101ff0404030205a0301d0603551d250416301406082b0601050507030106082b0601050507030230818f0603551d1f0481873081843040a03ea03c863a687474703a2f2f63726c332e64696769636572742e636f6d2f4469676943657274544c53525341534841323536323032304341312d342e63726c3040a03ea03c863a687474703a2f2f63726c342e64696769636572742e636f6d2f4469676943657274544c53525341534841323536323032304341312d342e63726c303e0603551d20043730353033060667810c0102023029302706082b06010505070201161b687474703a2f2f7777772e64696769636572742e636f6d2f435053307f06082b0601050507010104733071302406082b060105050730018618687474703a2f2f6f6373702e64696769636572742e636f6d304906082b06010505073002863d687474703a2f2f636163657274732e64696769636572742e636f6d2f4469676943657274544c53525341534841323536323032304341312d312e63727430090603551d13040230003082017e060a2b06010401d6790204020482016e0482016a0168007600e83ed0da3ef5063532e75728bc896bc903d3cbd1116beceb69e1777d6d06bd6e00000180475e1358000004030047304502204abeced8a8ae4ec13dc7b2188a8d0bf1b430c6be3a08e1fb7d4f439eed03ad1d022100bbdd335b5c14e208fbe094a11db90dac91c6001b229d1d58507b160f2dbad78900760035cf191bbfb16c57bf0fad4c6d42cbbbb627202651ea3fe12aefa803c33bd64c00000180475e13390000040300473045022100d707c83bf705b5bfb00581301b2171efa3624b3df733b258d07b69cf3697f48802206ab37a5f2b779edc99017000158e5a7934bb88948b85207803ffd8e5e9dc19f3007600b3737707e18450f86386d605a9dc11094a792db1670c0b87dcf0030e7936a59a00000180475e136e000004030047304502206895c4836bbba77c8c9840e3bcb89f64fe0fce0b15b9ac21ed92ee2a445f928c0221009a525aaf9a04b70c9b54e1c0e27febec9d8ba806daa2886f87c1fae640d7f734300d06092a864886f70d01010b050003820101008ef7df9856b26092ca4b6cff19c98141f6c04626cb9a7f8b48bc72fed8d1e65e930ce19c081ff9e4f16d0f9fde54a172c5d3576bb18002f57ee6694355f8997936a7173463dd41549dce88157c38bfa930ea8bf4fc9332ea9e937e54beca148c46c63153073a00755e9fc789d277952ae611259c1d1f3e17121f5756a17f3663bae3ffc9f29a752079c500bb308e8c51844c192360d99f1776a070bfc39cd9c74263b9d399e3cb276ff46f0f27e0ebc95a1a231430a49c4fcd43dae9df35a39f01912399003f7fedeb9d86e71d99e02ba395f6fccdc487b36a16ef64addde0e3c4877ffb2f711077fe814c0c0f0f169f521ffcb1512c542861da68227b994b0e'
  const leafBuffer = new Buffer()
  for (let i = 0; i < hexLeaf.length; i=i+2) {
    const num = parseInt(`0x${hexLeaf[i]}${hexLeaf[i+1]}`)
    leafBuffer.writeUint8(num)
  }
  const derLeaf = leafBuffer.drain()
  const asn1Leaf = asn1js.fromBER(derLeaf)
  const certLeaf = new Certificate({ schema: asn1Leaf.result })
  console.log('certLeaf',certLeaf)
  
  // // validity
  // const now = Date.now()
  // const notAfter = Number(new Date(certLeaf.notAfter.value))
  // const notBefore = Number(new Date(certLeaf.notBefore.value))
  // console.log('validity',now<notAfter && now > notBefore)

  //chain validation
  const chainEngine = new CertificateChainValidationEngine({
    certs:[ certIntermediate,certLeaf ],
    trustedCerts,
    checkDate: new Date()
  })

  const valid = await chainEngine.verify()

  console.log('valid',valid)
    
  // const cert = AsnParser.parse(der.bytes, Certificate)

  // const ext = cert.tbsCertificate.extensions?.at(2)

  // const str = bytes2str(new Uint8Array(ext?.extnValue.buffer || new ArrayBuffer(0)))

  // console.log('ext',str)

  // const valid = new Validity({
  //   notBefore:new Date(cert.tbsCertificate.validity.notBefore.utcTime+''),
  //   notAfter:new Date(cert.tbsCertificate.validity.notAfter.utcTime+'')
  // })

  // console.log('header',header)

  // expect(header.length).toBe(0x48)
  // expect(header.version).toBe(0x0303)
}

// export function testHmac() {

//   const ec = new ECC('p256')
//   const client_key = ec.genKeyPair()
//   const client_private_key = client_key.getPrivate()
//   const client_public_key = client_key.getPublic()

//   const server_key = ec.genKeyPair()
//   const server_private_key = server_key.getPrivate()
//   const server_public_key = server_key.getPublic()

//   const pms = server_public_key.mul(client_private_key)
//   // const client_pms = server_public_key.mul(client_private_key)
//   // const server_pms = client_public_key.mul(server_private_key)

//   // console.log(client_pms.getX().eq(server_pms.getX()))
//   // console.log(client_pms.getY().eq(server_pms.getY()))

//   const client_random = getRandom(16)
//   const server_random = getRandom(16)

//   function derivateMS(){
//     const seedBuf = new Buffer()
//     seedBuf.writeBytes(str2U8Array('master secret'))
//     seedBuf.writeBytes(client_random)
//     seedBuf.writeBytes(server_random)
//     const seed = bytes2str(seedBuf.drain())
  
//     const a0 = seed
//     const a1 = HmacSHA256(a0,pms.encode('hex',false))
//     const a2 = HmacSHA256(a1,pms.encode('hex',false))
//     const p1 = HmacSHA256(a1+seed,pms.encode('hex',false))
//     const p2 = HmacSHA256(a2+seed,pms.encode('hex',false))
//     const ms = (p1.concat(p2)).toString().slice(0,96)
//     return ms 
//   }

//   function derivateKey(ms:string){
//     const seedBuf = new Buffer()
//     seedBuf.writeBytes(str2U8Array('key expansion'))
//     seedBuf.writeBytes(server_random)
//     seedBuf.writeBytes(client_random)
//     const seed = bytes2str(seedBuf.drain())
  
//     const a0 = seed
//     const a1 = HmacSHA256(a0,ms)
//     const a2 = HmacSHA256(a1,ms)
//     const p1 = HmacSHA256(a1+seed,ms)
//     const p2 = HmacSHA256(a2+seed,ms)
//     const key = (p1.concat(p2)).toString().slice(0,80)
//     const client_mac_key = key.slice(0,32*2)
//     const server_mac_key = key.slice(32*2,64*2)
//     const client_write_key = key.slice(64*2,80*2)
//     const server_write_key = key.slice(80*2,96*2)
//     return [ client_mac_key,server_mac_key,client_write_key,server_write_key ]
//   }

//   // function getVerifyData(ms:string, handshake_hash:string){
//   //   const seedBuf = new Buffer()
//   //   seedBuf.writeBytes(str2U8Array('client finished'))
//   //   seedBuf.writeBytes(str2U8Array(handshake_hash))
//   //   const seed = bytes2str(seedBuf.drain())
//   //   const a0=seed
//   //   const a1 = HmacSHA256(a0,ms)
//   //   const p1 = HmacSHA256(a1+seed,ms)
//   //   const verify_data = p1.toString().slice(0,24)
//   //   return verify_data
//   // }

//   function getVerifyData(key:string, handshake_hash:string){
//     const seedBuf = new Buffer()
//     seedBuf.writeBytes(str2U8Array('client finished'))
//     seedBuf.writeBytes(str2U8Array(handshake_hash))
//     const seed = bytes2str(seedBuf.drain())
//     const a0=seed
//     const a1 = HmacSHA256(a0,key)
//     const p1 = HmacSHA256(a1+seed,key)
//     const verify_data = p1.toString().slice(0,24)
//     return verify_data
//   }
  

//   function getMac(verify_data:string,client_mac_key:string){
//     const data = u8Array2Str(new Uint8Array([ 0,0,0,0,0,0,0,0,22,3,3,0,16 ]))
//     return HmacSHA256(data+verify_data,client_mac_key)
//   }

//   // export const pad = (s: string): string => s.length % 2 === 0 ? s : `0${s}`


//   const ms = derivateMS()
//   const [ client_mac_key, server_mac_key, client_write_key, server_write_key ] = derivateKey(ms)
//   const iv = getRandom(16)
//   const verify_data = getVerifyData(ms,'')
//   const mac = getMac(verify_data,client_mac_key)
//   const recordBuffer = new Buffer()
//   recordBuffer.writeBytes(iv)
//   recordBuffer.writeUint8(22)
//   recordBuffer.writeUint24(12)
//   recordBuffer.writeBytes(hex2Bytes(verify_data))
//   recordBuffer.writeBytes(hex2Bytes(mac.toString()))

//   const padding = new Uint8Array(15).fill(15)
//   recordBuffer.writeBytes(padding)
//   recordBuffer.writeUint8(15)

//   const genericBlockCipher = recordBuffer.drain()
  
  
//   // MAC(MAC_write_key, seq_num +
//   //   TLSCompressed.type +
//   //   TLSCompressed.version +
//   //   TLSCompressed.length +
//   //   TLSCompressed.fragment);


//   //   struct {
//   //     opaque IV[SecurityParameters.record_iv_length];  //16 bytes random
//   //     block-ciphered struct {
//   //         opaque content[TLSCompressed.length];   //16 bytes = 4 bytes header + 12 bytes verify_data
//   //         opaque MAC[SecurityParameters.mac_length]; // 32 bytes
//   //         uint8 padding[GenericBlockCipher.padding_length]; //15 bytes padding(0x0f)
//   //         uint8 padding_length;// 1 byte
//   //     };
//   // } GenericBlockCipher;

//   //8 bytes nounce + 4 bytes header + 12 bytes verify_data + 16 bytes tag

// }