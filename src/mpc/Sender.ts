import { Bits } from "bitwise/types"
import sodium from "sodium"
import { AESCTRdecrypt, assert, concatArray, getRandom, splitArray, u8Array2Bits, equalArray, sha256, xor, u8Array2Int } from "../utils"
import OTCommon from "./OTCommon"


/**
 * Based KOS15 protocol
 */
export default class Sender extends OTCommon {
  count: number // OT base count
  totalCount: number // OT base count
  delta?: Uint8Array
  deltaBits?: Bits
  decKeys?: Buffer[]
  seedCommitR?: Uint8Array
  seedS?: Uint8Array
  RQ0?: Uint8Array
  RQ1?: Uint8Array
  sentCount = 0
  constructor(count: number) {
    super()
    this.count = count
    this.totalCount = Math.ceil(count / 8) * 8 + this.extraCount
  }
  /**
   * exchange key with receiver
   * 
   * @param pKeyR receiver public key
   * @param seedCommitR receiver seed commit
   */
  keySetup(pKeyR: Uint8Array, seedCommitR: Uint8Array) {
    this.seedCommitR = seedCommitR
    this.seedS = getRandom(new Uint8Array(16))
    this.delta = getRandom(new Uint8Array(16))
    this.deltaBits = u8Array2Bits(this.delta).reverse()

    const keys = []
    this.decKeys = []

    for (const bit of this.deltaBits) {
      const sKeyS = sodium.crypto_core_ristretto255_scalar_random();
      let pKeyS = sodium.crypto_scalarmult_ristretto255_base(sKeyS);
      if (bit == 1) {
        pKeyS = sodium.crypto_core_ristretto255_add(pKeyR, pKeyS);
      }
      const k = sodium.crypto_generichash(16, sodium.crypto_scalarmult_ristretto255(sKeyS, pKeyR));
      this.decKeys.push(k);
      keys.push(pKeyS)
    }

    return [concatArray(...keys), this.seedS]
  }

  /**
   * extension ot columns
   * 
   * @param baseColumns receiver ot columns
   * @param seedR receiver seed share
   * @param x 
   * @param t 
   */
  async extensionSetup(baseColumns: Uint8Array, seedR: Uint8Array, x: Uint8Array, t: Uint8Array) {
    if (!this.decKeys || !this.deltaBits || !this.seedCommitR || !this.seedS || !this.delta) return;

    assert(seedR.length == 16)
    assert(baseColumns.length % 256 == 0)
    assert(equalArray(await sha256(seedR), this.seedCommitR), 'Bad seed commit')

    const encCols = splitArray(baseColumns, 256)

    const decCols = []

    for (let i = 0; i < 128; i++) {
      if (this.deltaBits[i] == 0) {
        decCols.push(await AESCTRdecrypt(this.decKeys[i], encCols[i * 2]))
      } else {
        decCols.push(await AESCTRdecrypt(this.decKeys[i], encCols[i * 2 + 1]))
      }
    }

    const Q0 = this.transformToBits(decCols)
    const seed = await this.combineSeedShare(seedR, this.seedS, this.totalCount)

    let q = new Uint8Array(32).fill(0);
    for (let i = 0; i < Q0.length; i++) {
      const rand = seed.subarray(i * 16, (i + 1) * 16);
      q = xor(q, this.ncbm128(Q0[i], rand))
    }

    assert(equalArray(t, xor(q, this.ncbm128(x, this.delta))))

    const Q1 = [];
    for (let i = 0; i < Q0.length; i++) {
      Q1.push(xor(Q0[i], this.delta));
    }
    this.RQ0 = await this.crhf(Q0.slice(0, -this.extraCount));
    this.RQ1 = await this.crhf(Q1.slice(0, -this.extraCount));
  }

  send(){}

}