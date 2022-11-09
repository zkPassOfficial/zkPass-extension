import { getRandom, xor, splitArray, AESCTRencrypt, Salsa20, concatArray, int2U8Array, u8Array2Bits, u8Array2Int, bits2U8Array } from '../utils'

// common methods for sender and receiver
export default class OTCommon {
  extraCount = 256 //KOS15 

  extendRTo128(r: Uint8Array): Array<Uint8Array> {
    const bits = u8Array2Bits(r).reverse()
    const row_0 = new Uint8Array(16).fill(0)
    const row_1 = new Uint8Array(16).fill(255)
    return bits.map(b => b === 0 ? row_0 : row_1)
  }

  secretShare(rMatrix: Array<Uint8Array>) {
    const T0 = []
    const T1 = []
    for (let i = 0; i < rMatrix.length; i++) {
      const r = getRandom(16)
      T0.push(r)
      T1.push(xor(rMatrix[i], r))
    }
    return [ T0, T1 ]
  }

  transposeMatrix(data: Uint8Array[]): Uint8Array[] {
    const arr = data.map(v => u8Array2Bits(v).reverse())
    const matrix = arr[0].map((col, i) => arr.map(row => row[i]))
    return matrix.map(m => bits2U8Array(m.reverse()))
  }

  /**
 * no-carry binary multiplication
 **/
  ncbm128(a: Uint8Array, b: Uint8Array) {

    let res = 0n
    const bits_a = u8Array2Bits(a)
    const int_b = u8Array2Int(b) as bigint
    for (let i = 0n; i < 128n; i++) {
      if (bits_a[Number(i)]) { 
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
    const key = new Uint8Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32 ])
    return concatArray(...splitArray(message, 16).map(c => Salsa20(key, c)))
  }
  /**
   * Correlation Robust Hash Function
   * */
  async crhf(rows: Uint8Array[]) {
    const r = await this.keyCipher(concatArray(...rows))

    const index_arr = Array(rows.length).fill(0).map((a, i) => int2U8Array(i, 16))

    return xor(await this.keyCipher(xor(r, concatArray(...index_arr))), r)
  }
}