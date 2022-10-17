import { Byte } from "bitwise/types"
import { ba2Byte, bytes2Bits, getRandom } from "../utils"

// common methods for sender and receiver
export default class OTCommon {
  extendRTo128(r: Uint8Array) {
    const bits = bytes2Bits(ba2Byte(r)).reverse()

    const row_1 = new Uint8Array(16).fill(255)
    const row_0 = new Uint8Array(16).fill(0)

    return bits.map(b => b === 0 ? row_0 : row_1)
  }

}