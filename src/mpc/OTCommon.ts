import { Bits, Byte, UInt8 } from 'bitwise/types'
import { ba2Byte, bytes2Bits, getRandom, xor, splitArray, AESCTRencrypt, Salsa20, concatArray, int2U8Array, u8Array2Bits, u8Array2Int, bits2Bytes, ba2int } from '../utils'

// common methods for sender and receiver
export default class OTCommon {
  extraCount = 256 //KOS15 

  extendRTo128(r: Uint8Array): Array<Uint8Array> {
    const bits = bytes2Bits(ba2Byte(r)).reverse()

    const row_1 = new Uint8Array(16).fill(255)
    const row_0 = new Uint8Array(16).fill(0)

    return bits.map(b => b === 0 ? row_0 : row_1)
  }

  secretShare(rMatrix: Array<Uint8Array>) {
    const T0 = []
    const T1 = []
    for (let i = 0; i < rMatrix.length; i++) {
      const r = getRandom(new Uint8Array(16))
      T0.push(r)
      T1.push(xor(rMatrix[i], r))
    }
    return [ T0, T1 ]
  }

  transformToBits(data: Array<Uint8Array>): Uint8Array[] {
    return data.map(x => bits2Bytes(bytes2Bits(ba2Byte(x)).reverse())).map(x => new Uint8Array(x.map(v => ba2int(v))))
  }

  /**
 * no-carry binary multiplication
 **/
  ncbm128(a: Uint8Array, b: Uint8Array) {
    const bits_a = u8Array2Bits(a)
    const int_b = u8Array2Int(b)
    let res = 0

    for (let i = 0; i < 128; i++) {
      if (bits_a[i]) {
        res ^= (int_b << i)
      }
    }

    return int2U8Array(res, 32)
  }

  async combineSeedShare(senderSeed: Uint8Array, receiverSeed: Uint8Array, count: number) {
    const seed = xor(senderSeed, receiverSeed)
    return await AESCTRencrypt(seed, new Uint8Array(count * 16).fill(0))
  }

  async keyCipher(message: Uint8Array) {
    const key = new Uint8Array(32).fill(0)

    return concatArray(...splitArray(message, 16).map(c => Salsa20(key, c)))
  }
  /**
   * Correlation Robust Hash Function
   * */
  async crhf(rows: Uint8Array[]) {
    const r = await this.keyCipher(concatArray(...rows))
    const index_arr = Array(rows.length).map((a, i) => int2U8Array(i, 16))

    return xor(await this.keyCipher(xor(r, concatArray(...index_arr))), r)
  }
}