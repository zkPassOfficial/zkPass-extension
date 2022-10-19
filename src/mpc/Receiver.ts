import sodium from "sodium"
import { Bits } from "bitwise/types"
import OTCommon from "./OTCommon"
import { AESCTRencrypt, assert, concatArray, getRandom, int2U8Array, sha256, splitArray, u8Array2Bits, xor, bits2U8Array } from "../utils"

/**
 * Based KOS15 protocol
 */
export class OTReceiver extends OTCommon {
  count: number
  totalCount: number // OT base count
  seedS?: Uint8Array
  T0?: Uint8Array[]
  T1?: Uint8Array[]
  sKeyR?: Uint8Array
  pKeyS?: Uint8Array
  rBits: Bits
  maskArr: Uint8Array

  cBitsSend = 0
  receivedCount = 0
  constructor(count: number) {
    super();
    this.count = count
    this.totalCount = Math.ceil(count / 8) * 8 + this.extraCount
    this.rBits = []
    this.maskArr = new Uint8Array()
  }

  async keySetup() {
    this.seedS = getRandom(new Uint8Array(16))
    const seedCommit = await sha256(this.seedS)
    const r = getRandom(new Uint8Array(this.totalCount / 8))
    const R = this.extendRTo128(r);
    this.rBits = u8Array2Bits(r).reverse();

    [this.T0, this.T1] = this.secretShare(R);

    this.sKeyR = sodium.crypto_core_ristretto255_scalar_random();
    this.pKeyS = sodium.crypto_scalarmult_ristretto255_base(this.sKeyR);
    return [this.pKeyS, seedCommit];
  }

  async extensionSetup(keys: Uint8Array, seedS: Uint8Array) {
    if (!this.T0 || !this.T1 || !this.seedS || !this.rBits) return

    assert(keys.length == 128 * 32);
    assert(seedS.length == 16);

    const encCols = [];

    const T0 = this.transformToBits(this.T0);
    const T1 = this.transformToBits(this.T1);

    const pKeyS_arr = splitArray(keys, 32)

    for (let i = 0, len = pKeyS_arr.length; i < len; i++) {
      const pKeyS = pKeyS_arr[i]
      const k0 = sodium.crypto_generichash(16, sodium.crypto_scalarmult_ristretto255(this.sKeyR, pKeyS))
      encCols.push(await AESCTRencrypt(k0, T0[i]))

      const sub = sodium.crypto_core_ristretto255_sub(pKeyS, this.pKeyS)
      const k1 = sodium.crypto_generichash(16, sodium.crypto_scalarmult_ristretto255(this.sKeyR, sub))
      encCols.push(await AESCTRencrypt(k1, T1[i]))
    }

    const seed = await this.combineSeedShare(this.seedS, seedS, this.totalCount)

    let x = new Uint8Array(16).fill(0)
    let t = new Uint8Array(32).fill(0)

    for (let i = 0; i < this.T0.length; i++) {
      const rand = seed.subarray(i * 16, (i + 1) * 16)
      if (this.rBits[i] == 1) {
        x = xor(x, rand)
      }
      t = xor(t, this.ncbm128(this.T0[i], rand))
    }

    this.maskArr = await this.crhf(this.T0.slice(0, -this.extraCount));

    this.rBits = this.rBits.slice(0, -this.extraCount);

    return [concatArray(...encCols), this.seedS, x, t];
  }
  /**
   * send choices bits to sender
   * @param cBits choices Bits 
   * @returns 
   */
  send(cBits: Uint8Array) {
    assert(this.receivedCount + cBits.length <= this.count)

    assert(this.cBitsSend == 0);

    const sentBits = cBits.map((b, i) => b ^ this.rBits[this.receivedCount + i])

    const fill_len = 8 - cBits.length % 8

    const fill_arr = Array(fill_len).fill(0)

    this.cBitsSend = cBits.length;

    return concatArray(int2U8Array(fill_len, 1), bits2U8Array([...sentBits, ...fill_arr]));
  }

  /**
   * parse the masked bits
   * @param cBits choices Bits 
   * @param mBits masked Bits
   * @returns 
   */
  receive(cBits: Uint8Array, mBits: Uint8Array) {
    assert(this.cBitsSend == cBits.length)
    assert(this.cBitsSend * 32 == mBits.length)

    const decCols = []

    const unUsedMark = splitArray(this.maskArr, 16).slice(this.receivedCount + 1)

    for (let i = 0, len = cBits.length; i < len; i++) {
      const m0 = mBits.slice(i * 32, i * 32 + 16)
      const m1 = mBits.slice(i * 32 + 16, i * 32 + 32)
      if (cBits[i] === 0) {
        decCols.push(xor(m0, unUsedMark[i]))
      } else {
        decCols.push(xor(m1, unUsedMark[i]))
      }
    }

    this.receivedCount += cBits.length;
    this.cBitsSend = 0;

    return concatArray(...decCols);
  }
}