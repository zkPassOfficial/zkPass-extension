import { assert } from '../utils'

export default class OTDependencies {
  encBlocks: number //aes-gcm aad+1 len+1
  count: number // OT count
  maxPower: number // Hash function power
  oddTable = { 5: [ 4, 1 ], 7: [ 4, 3 ], 9: [ 8, 1 ], 11: [ 8, 3 ], 13: [ 12, 1 ], 15: [ 12, 3 ], 17: [ 16, 1 ], 19: [ 16, 3 ], 21: [ 17, 4 ], 23: [ 17, 6 ], 25: [ 17, 8 ], 27: [ 19, 8 ], 29: [ 17, 12 ], 31: [ 19, 12 ], 33: [ 17, 16 ], 35: [ 19, 16 ] }
  // powerBlockSizeMap key-> max power value-> max blocks
  powerBlockSizeMap = { 0: 0, 3: 19, 5: 29, 7: 71, 9: 89, 11: 107, 13: 125, 15: 271, 17: 305, 19: 339, 21: 373, 23: 407, 25: 441, 27: 475, 29: 509, 31: 1023, 33: 1025, 35: 1027 }
  finishCount = 256 + 256 //Client_Finished->256 Server_Finished ->256

  //aes-128 plaintext/16
  constructor(blockCount: number) {
    this.encBlocks = blockCount + 2
    this.maxPower = this.computeMaxPowerByCount(this.encBlocks)
    this.count = this.computeOTcount()
  }

  computeOTcount(): number {
    const el = new Uint8Array(16).fill(0)

    //client already have 1, 2, 3 
    const shareGroup = [ undefined, el, el, el ]

    Object.keys(this.oddTable).forEach((key)=>{
      if(parseInt(key) <= this.maxPower){
        shareGroup[parseInt(key)]= el
      }
    })

    const needOTShare: Set<number> = new Set<number>()

    this.fillShareGroup(shareGroup, this.encBlocks, el)

    this.fillNeedOTShare(shareGroup, this.encBlocks, needOTShare)

    // Each power requires 128 OTs(1,2,3 already exists)
    const pownerCount = this.maxPower - 3
    // needOTShare.size * 128 * 2 -> each share need to ots
    return pownerCount * 128 + needOTShare.size * 128 * 2
  }

  /**
   * fill the share which need to transport by ot
   * @param shareGroup 
   * @param maxPower 
   * @param needOTShare 
   */
  fillNeedOTShare(shareGroup: (Uint8Array | undefined)[], blocks: number, needOTShare: Set<number> ){
    for (let i=1; i <= blocks; i++){
      if (shareGroup[i] == undefined){
        const [ a ] = this.splitShareByExited(shareGroup, i)
        needOTShare.add(a)
      }
    }
  }
  /**
   * fill the shareGroup for client which can be computed by exist share
   * @param shareGroup 
   * @param maxPower 
   * @param el 
   */
  fillShareGroup(shareGroup: (Uint8Array | undefined)[], blocks: number, el: Uint8Array) {
    for (let i=0; i <= blocks; i++){
      if (shareGroup[i] == undefined || i % 2 == 0){
        continue
      }

      let j = i
      while (j * 2 <= blocks){
        j = j * 2
        if (shareGroup[j] == undefined){
          shareGroup[j] = el
        }
      }
    }
  }

  splitShareByExited(share: (Uint8Array | undefined)[], targetNumber: number){
    
    for (let i=1; i < targetNumber; i++){
      if (share[i] == undefined){
        continue
      }
      for (let j=i; j< targetNumber; j++){        
        if (share[j] == undefined){
          continue
        }
        if (i+j === targetNumber){
          return [ i, j ]
        }
      }
    }
    throw Error('Can not split targetNumber range of share')
  }

  computeMaxPowerByCount(count: number): number {

    assert(count <= 1026, 'The maximum number of blocks is exceeded')

    const entry = Object.entries(this.powerBlockSizeMap).find(([ , value ]) => value >= count) || [ '0', 0 ]

    return parseInt(entry[0])
  }

}