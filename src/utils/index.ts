import { isEqual } from 'lodash'
import bitwise from 'bitwise'
import { Bits, Byte, UInt8 } from 'bitwise/types'
import aesjs from 'aes-js'
import NodeSalsa20, { toArrayBuffer } from "../lib/salsa20"

export const equalArray = (a: Array<any> | Uint8Array, b: Array<any> | Uint8Array): boolean => isEqual(a, b)

export const xor = (a: Bits, b: Bits): Bits => bitwise.bits.xor(a, b)

export const ba2Byte = (arr: Uint8Array) => {
  const r_arr: UInt8[] = Array.from(arr).map(x => x as UInt8)
  return r_arr.map(x => int2ba(x))
}

export const getRandom = (n: Uint8Array): Uint8Array => new Crypto().getRandomValues(n)

export const int2ba = (i: UInt8): Byte => bitwise.byte.read(i)

export const str2ba = (s: string): Array<0 | 1> => bitwise.string.toBits(s)

export const ba2int = (bits: Byte): UInt8 => bitwise.byte.write(bits)

export const bytes2Bits = (ba: Byte[]): Bits => {
  let bitsArray: Bits = []

  for (const b of ba) {
    bitsArray = bitsArray.concat(b)
  }
  return bitsArray
}

export const bits2Bytes = (bits: Bits): Byte[] => {
  assert(bits.length % 8 === 0)
  const bytes: Byte[] = []

  for (let i = 0, len = bits.length / 8; i < len; i++) {
    const byte = Array.from(bits.slice(i, i + 8)) as Byte
    bytes.push(byte)
  }
  return bytes
}

export const concatArray = (...args: Array<any>): Uint8Array => {
  let arr: any[] = []
  for (const a of args) {
    arr = arr.concat(a)
  }
  return new Uint8Array(arr)
}

export const splitToChunks = (ba: Byte[], size: number): Array<Byte[]> => {
  assert(ba.length % size === 0)
  const result: Array<Byte[]> = []

  for (let i = 0, len = ba.length / size; i < len; i++) {
    result.push(ba.slice(i, i + size))
  }

  return result
}

export const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    console.trace();
    throw message || 'Failed';
  }
}

export const sha256 = async (ba: Byte) => {

  const bits = bytes2Bits([ba])

  const buffer = bitwise.buffer.create(bits)

  const result = await new Crypto().subtle.digest('SHA-256', buffer)

  return new Uint8Array(result)
}

export const AESCTRencrypt = (key: Uint8Array, data: Uint8Array) => {
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(0));
  return aesCtr.encrypt(data);
}

export const AESCTRdecrypt = (key: Uint8Array, ciphertext: Uint8Array) => {
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(0));
  return aesCtr.decrypt(ciphertext);
}



export const Salsa20 = (key: Uint8Array, data: Uint8Array) => {
  //nonce => {'e', 'x', 'p', 'a', 'n', 'd', ' ', '3', '2', '-', 'b', 'y', 't', 'e', ' ', 'k'}
  const nonce = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
  const encryptor = new NodeSalsa20({ rounds: 20 });
  encryptor.setKey(key).setNonce(nonce)

  if (encryptor.encrypt) {
    return encryptor.encrypt(toArrayBuffer(data))
  }

}