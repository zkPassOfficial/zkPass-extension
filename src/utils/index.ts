import aesjs from 'aes-js'
import { randBytesSync } from 'bigint-crypto-utils'
import bitwise from 'bitwise'
import { Bits, Byte, UInt8 } from 'bitwise/types'
import { isEqual } from 'lodash'
import NodeSalsa20 from 'node-salsa20'
import { bytes2uintBE } from './numeric'

export const equalArray = (a: Array<any> | Uint8Array, b: Array<any> | Uint8Array): boolean => isEqual(a, b)

export const xor = (a: Uint8Array, b: Uint8Array): Uint8Array => a.map((v, i) => {
  return v ^ b[i]
})

export const ba2Byte = (arr: Uint8Array) => {
  const r_arr: UInt8[] = Array.from(arr).map(x => x as UInt8)
  return r_arr.map(x => int2ba(x))
}

export const getRandom = (n: number) => {
  const rand = randBytesSync(n)
  return new Uint8Array(rand)
}

export const int2ba = (i: UInt8): Byte => bitwise.byte.read(i)

export const int2U8Array = (i: number | bigint, size?: number): Uint8Array => {

  let str = i.toString(16)

  if (str.length % 2 === 1) {
    str = `0${str}`
  }

  const arr = []
  for (let i = 0; i < str.length / 2; i++) {
    arr.push(parseInt(str.slice(2 * i, 2 * i + 2), 16))
  }

  const len = arr.length

  if (size && len < size) {
    return concatArray(new Uint8Array(size - len), new Uint8Array(arr))
  } else if (size && len > size) {
    return new Uint8Array(arr.splice(0, size))
  }
  return new Uint8Array(arr)
}

export const u8Array2Int = (n: Uint8Array) => {
  if(n.length <= 8) return bytes2uintBE(n)
  const str = Array.from(n).map(b=>{
    let strNum = b.toString(16)
    if(strNum.length == 1) strNum = `0${strNum}`
    return strNum
  }).join('')

  return BigInt(`0x${str}`)

}

export const u8Array2Bits = (n: Uint8Array): Bits => {
  const bits = Array(n.length * 8)// little endian
  let index = 0
  for (let i = n.length - 1; i >= 0; i--) {
    for (let j = 0; j < 8; j++) {
      bits[index] = (n[i] >> j) & 0x01
      index++
    }
  }
  return bits
}

export const str2Bits = (s: string): Array<0 | 1> => bitwise.string.toBits(s)

export const str2U8Array = (s: string): Uint8Array => {
  const arr = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    arr[i] = s.charCodeAt(i)
  }
  return arr
}

export const u8Array2Str = (arr: Uint8Array): string => {
  let s = ''
  for (const a of arr) {
    s += String.fromCharCode(a)
  }
  return s
}

export const ba2int = (bits: Byte): UInt8 => bitwise.byte.write(bits)

export const bytes2Bits = (ba: Byte[]): Bits => {
  let bitsArray: Bits = []

  for (const b of ba) {
    bitsArray = bitsArray.concat(b)
  }
  return bitsArray
}

export const bits2U8Array = (bits: Bits): Uint8Array => {
  const ba = new Uint8Array(bits.length/8)
  for (let i=0; i < ba.length; i++){
    let sum = 0
    for (let j=0; j < 8; j++){
      sum += bits[i*8+j] * (2**j)
    }
    ba[ba.length-1-i] = sum
  }
  return ba
}

export const bits2Bytes = (bits: Bits): Byte[] => {
  assert(bits.length % 8 === 0)
  const bytes: Byte[] = []

  for (let i = 0, len = bits.length / 8; i < len; i++) {
    const byte = Array.from(bits.splice(0, 8)) as Byte
    bytes.push(byte)
  }
  return bytes
}

export const concatArray = (...args: Uint8Array[]): Uint8Array => {
  let arr: any[] = []
  for (const a of args) {
    arr = arr.concat(Array.from(a))
  }
  return new Uint8Array(arr)
}

export const splitArray = (ba: Uint8Array, size: number): Uint8Array[] => {
  assert(ba.length % size === 0)
  const result = []
  const arr = Array.from(ba)

  for (let i = 0, len = arr.length / size; i < len; i++) {
    result.push(new Uint8Array(arr.splice(0, size)))
  }

  return result
}

export const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    console.trace()
    throw message || 'Failed'
  }
}

export const sha256 = async (ba: Uint8Array) => {

  const result = await crypto.subtle.digest('SHA-256', ba.buffer)

  return new Uint8Array(result)
}

export const AESCTRencrypt = (key: Uint8Array, data: Uint8Array) => {
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(0))
  return aesCtr.encrypt(data)
}

export const AESCTRdecrypt = (key: Uint8Array, ciphertext: Uint8Array) => {
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(0))
  return aesCtr.decrypt(ciphertext)
}

export const Salsa20 = (key: Uint8Array, data: Uint8Array) => {
  //nonce => {'e', 'x', 'p', 'a', 'n', 'd', ' ', '3', '2', '-', 'b', 'y', 't', 'e', ' ', 'k'}
  const nonce = new Uint8Array([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ])
  const encryptor = new NodeSalsa20({ rounds: 20 })
  encryptor.key(key).nonce(nonce)

  if (encryptor.encrypt) {
    return new Uint8Array(encryptor.encrypt(data.buffer))
  }

  return new Uint8Array(data.buffer)

}

export const pad = (s: string): string => s.length % 2 === 0 ? s : `0${s}`

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve , ms))

export const parsePem=(pem : string)=>{
  const code_arr = pem.split('\n').map(item =>{
    if (item.trim().length > 0
        && item.indexOf('-BEGIN CERTIFICATE-') < 0
        && item.indexOf('-BEGIN PUBLIC KEY-') < 0
        && item.indexOf('-END PUBLIC KEY-') < 0
        && item.indexOf('-END CERTIFICATE-') < 0 ) {
      return item.trim()
    }
    return undefined
  }).filter(v=> v !== undefined).join('')

  console.log('pemstr', code_arr)
  
  const dec = atob(code_arr).split('').map(c=> c.charCodeAt(0))

  return new Uint8Array(dec).slice(26)
}

export async function loadRes(filePath: string){
  try{
    const pem = await fetch(filePath)
    return pem.text()
  }catch(error){
    console.log('load pem file failed', error)
    throw('load pem file failed')
  }
}

export function b64decode(str:string) {
  let dec
  if (typeof(window) === 'undefined') {
    dec = Buffer.from(str, 'base64')
  }
  else {
    dec = atob(str).split('').map(function(c) {
      return c.charCodeAt(0)
    })
  }
  return new Uint8Array(dec)
}