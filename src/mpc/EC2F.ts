import type { PublicKey as PublicKeyType } from 'paillier-bigint'
import { PublicKey } from 'paillier-bigint'
import { ec as EC } from 'elliptic'
import { modPow, randBetween, modInv } from 'bigint-crypto-utils'

import { concatArray, int2U8Array, pad, str2U8Array, u8Array2Str } from '../utils'

/**
 * Elliptic curve to Field
 */
export class EC2F {
  ec: any
  server_public_key: any
  client_public_key: bigint
  paPubkey?: PublicKeyType // paillier pub key
  s_x: bigint // public key share x
  s_y: bigint // public key share y
  p: bigint
  E_A_mul_MA_plus_NA?: bigint
  NA_mod_p?: bigint
  e_neg_xn?: bigint
  e_neg_x?: bigint
  pub_x?: bigint
  pub_y?: bigint
  sq?: bigint // PMS share

  MA = randBetween(2n ** 512n)
  NA = randBetween(2n ** 1024n)

  Mb = randBetween(2n ** 256n)
  Nb = randBetween(2n ** 512n)

  MB = randBetween(2n ** 512n)
  NB = randBetween(2n ** 1024n)

  Sq = randBetween(2n ** 1027n)

  constructor(x: string, y: string) {

    this.ec = new EC('p256')

    const key = this.ec.genKeyPair()

    const pub = { x, y }

    this.server_public_key = this.ec.keyFromPublic(pub, 'hex').getPublic()

    const client_private_key = key.getPrivate()

    this.client_public_key = key.getPublic()

    const public_key_share = this.server_public_key.mul(client_private_key)

    this.s_x = public_key_share.getX()
    this.s_y = public_key_share.getY()

    this.p = this.ec.curve.p

    this.sq = this.p - (this.Sq % this.p)
  }

  passPubKey() {
    return str2U8Array(JSON.stringify({
      pub_x: pad(this.server_public_key.getX().toString(16)),
      pub_y: pad(this.server_public_key.getY().toString(16))
    }))
  }

  preComputeAB(data: Uint8Array) {
    const res = JSON.parse(u8Array2Str(data))

    const n = BigInt(`0x${res.n}`)
    const g = BigInt(`0x${res.g}`)
    const e_xn = BigInt(`0x${res.e_xn}`)
    this.e_neg_xn = BigInt(`0x${res.e_neg_xn}`)
    this.pub_x = BigInt(`0x${res.pub_x}`)
    this.pub_y = BigInt(`0x${res.pub_y}`)
    const e_pow_2_yn = BigInt(`0x${res.e_pow_2_yn}`)
    const e_neg_2_mul_yn = BigInt(`0x${res.e_neg_2_mul_yn}`)

    this.paPubkey = new PublicKey(n, g)

    const E_pow_y = this.paPubkey.encrypt(modPow(this.s_y, 2n, this.p))

    const E_A = this.paPubkey.addition(e_pow_2_yn, this.paPubkey.multiply(e_neg_2_mul_yn, this.s_y), E_pow_y)

    this.E_A_mul_MA_plus_NA = this.paPubkey.addition(this.paPubkey.multiply(E_A, this.MA), this.paPubkey.encrypt(this.NA))
    this.NA_mod_p = this.NA % this.p

    this.e_neg_x = this.paPubkey.encrypt(modPow(this.p - this.s_x, 1n, this.p))

    const E_B = this.paPubkey.addition(e_xn, this.e_neg_x)

    const E_b_mul_Mb_plus_Nb = this.paPubkey.addition(this.paPubkey.multiply(E_B, this.Mb), this.paPubkey.encrypt(this.Nb))

    const Nb_mod_p = this.Nb % this.p

    return str2U8Array(JSON.stringify({
      e_b_mul_Mb_plus_Nb: pad(E_b_mul_Mb_plus_Nb.toString(16)),
      Nb_mod_p: pad(Nb_mod_p.toString(16))
    }))
  }


  generatePubKey() {

    if (!this.sq) return

    const node_public_key = this.ec.keyFromPublic({ x: this.pub_x, y: this.pub_y }, 'hex').getPublic()

    const pubKey = node_public_key.add(this.client_public_key)

    return concatArray(int2U8Array(pubKey.x, 32), int2U8Array(pubKey.y, 32))
  }

  computeAB(data: Uint8Array) {
    if (!this.paPubkey || !this.E_A_mul_MA_plus_NA || !this.NA_mod_p) return

    const res = JSON.parse(u8Array2Str(data))

    const e_b_mul_Mb_pow_p_sub_3 = BigInt(`0x${res.e_b_mul_Mb_pow_p_sub_3}`)

    const inv = modInv(modPow(this.Mb, this.p - 3n, this.p), this.p)

    const E_B = this.paPubkey.multiply(e_b_mul_Mb_pow_p_sub_3, inv)

    const E_EB_mul_MB_plus_NB = this.paPubkey.addition(this.paPubkey.multiply(E_B, this.MB), this.NB)

    const NB_mod_p = this.NB % this.p

    return str2U8Array(JSON.stringify({
      e_B_mul_MB_plus_NB: pad(E_EB_mul_MB_plus_NB.toString(16)),
      NB_mod_p: pad(NB_mod_p.toString(16)),
      e_A_mul_MA_plus_NA: pad(this.E_A_mul_MA_plus_NA.toString(16)),
      NA_mod_p: pad(this.NA_mod_p.toString(16)),
    }))
  }

  computePMSShare(data: Uint8Array) {
    if (!this.paPubkey || !this.e_neg_x) return

    const res = JSON.parse(u8Array2Str(data))
    const e_A_mul_MA_mul_B_mul_MB = BigInt(`0x${res.e_A_mul_MA_mul_B_mul_MB}`)

    const E_AB = this.paPubkey.multiply(e_A_mul_MA_mul_B_mul_MB, modInv((this.MB * this.MA) % this.p, this.p))

    const E_A_mul_B_plus_C = this.paPubkey.addition(E_AB, this.e_neg_x, e_A_mul_MA_mul_B_mul_MB)

    const E_A_mul_B_plus_C_plus_Sq = this.paPubkey.addition(E_A_mul_B_plus_C, this.paPubkey.encrypt(this.Sq))

    return str2U8Array(JSON.stringify({
      e_A_mul_B_plus_C_plus_Sq: pad(E_A_mul_B_plus_C_plus_Sq.toString(16))
    }))
  }
}