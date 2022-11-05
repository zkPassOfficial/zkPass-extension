import { assert } from "console"

/**
 * generate 
 */
export default class OTDependencies {
  encBlocks: number //aes-gcm aad+1 len+1
  count: number // OT count
  maxPower: number // Hash function power
  oddTable = { 5: [4, 1], 7: [4, 3], 9: [8, 1], 11: [8, 3], 13: [12, 1], 15: [12, 3], 17: [16, 1], 19: [16, 3], 21: [17, 4], 23: [17, 6], 25: [17, 8], 27: [19, 8], 29: [17, 12], 31: [19, 12], 33: [17, 16], 35: [19, 16] }
  powerBlockSizeMap = { 0: 0, 3: 19, 5: 29, 7: 71, 9: 89, 11: 107, 13: 125, 15: 271, 17: 305, 19: 339, 21: 373, 23: 407, 25: 441, 27: 475, 29: 509, 31: 1023, 33: 1025, 35: 1027 }
  finishCount = 256 + 256//Client_Finished->256 Server_Finished ->256.

  constructor(blockCount: number) {
    this.encBlocks = blockCount + 2
    this.maxPower = this.computeMaxPowerByCount(this.encBlocks)
    this.count = this.computeOTcount(this.encBlocks)
  }

  computeOTcount(blocks: number): number {
    // Each power requires 128 OTs
    const pownerCount = this.maxPower - 3

    return pownerCount * 128
  }

  computeMaxPowerByCount(count: number): number {

    assert(count <= 1026, "The maximum number of blocks is exceeded")

    const entry = Object.entries(this.powerBlockSizeMap).find((key, value) => value >= count) || ['0', 0]

    return parseInt(entry[0])
  }

}
