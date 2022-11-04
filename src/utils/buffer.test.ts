import { describe, expect, test } from '@jest/globals'
import Buffer from './buffer'

describe('numeric',()=>{

  test('buffer.writeUint8(a)=buffer.readUint8()',()=>{
    const buffer = new Buffer()
    const a = 0x12
    buffer.writeUint8(a)
    expect(a).toBe(buffer.readUint8())
    expect(buffer.offset).toBe(1)
  })
  
  test('buffer.writeUint16(a)=buffer.readUint16()',()=>{
    const buffer = new Buffer()
    const a = 0x1234
    buffer.writeUint16(a)
    expect(a).toBe(buffer.readUint16())
    expect(buffer.offset).toBe(2)
  })
  
  test('buffer.writeUint24(b)=buffer.readUint24()',()=>{
    const buffer = new Buffer()
    const a = 0x123456
    buffer.writeUint24(a)
    expect(a).toBe(buffer.readUint24())
    expect(buffer.offset).toBe(3)
  })

  test('buffer.writeUint32(b)=buffer.readUint32()',()=>{
    const buffer = new Buffer()
    const a = 0x12345678
    buffer.writeUint32(a)
    expect(a).toBe(buffer.readUint32())
    expect(buffer.offset).toBe(4)
  })

  test('buffer.writeBytes(bytes)=buffer.readBytes(bytes.length)',()=>{
    const buffer = new Buffer()
    const bytes = new Uint8Array([ 0x11,0x22,0x33,0x44,0x55,0x66,0x77,0x88,0x99 ])
    buffer.writeBytes(bytes)
    expect(bytes).toEqual(buffer.readBytes(9))
    expect(buffer.offset).toBe(9)
  })

  test('buffer.writeUint32(a)=buffer.readBytes(4)',()=>{
    const buffer = new Buffer()
    const a = 0x12345678
    buffer.writeUint32(a)
    expect(new Uint8Array([ 0x12,0x34,0x56,0x78 ])).toEqual(buffer.readBytes(4))
  })

  test('grow',()=>{
    const buffer = new Buffer()

    for (let i = 0; i < 130; i++) {
      buffer.writeUint8(i)
    }
    
    expect(buffer.offset).toBe(130)
    expect(buffer.bytes.length).toBe(256)
  })

  test('peek',()=>{
    const buffer = new Buffer()

    for (let i = 0; i < 50; i++) {
      buffer.writeUint8(i)
    }
    
    expect(buffer.peekUint16(3)).toBe(0x0304)
  })

  test('peekBytes',()=>{
    const buffer = new Buffer()

    for (let i = 0; i < 50; i++) {
      buffer.writeUint8(i)
    }
    
    expect(buffer.peekBytes(3,4)).toEqual(new Uint8Array([ 3,4,5,6 ]))
  })

  test('shift',()=>{
    const buffer = new Buffer({byteLength:128})

    for (let i = 0; i < 128; i++) {
      buffer.writeUint8(i)
    }

    const chunk = buffer.shift(5)
    expect(chunk.bytes).toEqual(new Uint8Array([ 0,1,2,3,4 ]))
  })

})