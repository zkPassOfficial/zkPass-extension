import Buffer from '../src/utils/buffer'
import {bytes2BigInt} from '../src/utils/numeric'

describe('temp',()=>{

  test('pubkey',()=>{

    const pubkeyHex = '04997aa23fb2f377b3d846b3b5cb2bf74efda313ef7dce14f524ed1387dc5c276a3bfa788cfe12895c58a6c862646ce4e2fefe2f9db9418aa37a8c6df50a91fef2'
    // const hex_x = 0x997aa23fb2f377b3d846b3b5cb2bf74efda313ef7dce14f524ed1387dc5c276a
    // const hex_y = 0x3bfa788cfe12895c58a6c862646ce4e2fefe2f9db9418aa37a8c6df50a91fef2
    const buffer = new Buffer()

    for (let i = 0; i < pubkeyHex.length; i=i+2) {
      const hex = pubkeyHex.slice(i,i+2)
      buffer.writeUint8(parseInt(`0x${hex}`))
    }

    const bytes = buffer.drain()
    const half = (bytes.length-1)/2
    console.log('bytes',bytes)

    const x = bytes.slice(1,half+1)
    const y = bytes.slice(half+1,bytes.length)
    
    console.log('x', x)
    console.log('y', y)

    const big_x = bytes2BigInt(x)
    const big_y = bytes2BigInt(y)

    console.log(big_x,big_y)
  })

})