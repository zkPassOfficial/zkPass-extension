import { describe, expect, test } from '@jest/globals'
import {
  uint2bytesBE,
  uint2bytesLE,
  int2bytesBE,
  int2bytesLE,
  bytes2uintBE,
  bytes2uintLE,
  bytes2intBE,
  bytes2intLE
} from './numeric'

describe('numeric',()=>{

  test('uint2bytesBE(0x123456,3)=[0x12, 0x34, 0x56]',()=>{
    const hex = 0x123456
    const bytes = uint2bytesBE(hex,3)
    expect(bytes).toEqual(new Uint8Array([ 0x12, 0x34, 0x56 ]))
  })

  test('uint2bytesLE(0xFF3456,3)=[0x56, 0x34, 0xFF]',()=>{
    const hex = 0xFF3456
    const bytes = uint2bytesLE(hex,3)
    expect(bytes).toEqual(new Uint8Array([ 0x56, 0x34, 0xFF ]))
  })

  test('bytes2uintBE(uint2bytesBE(0x123456,3))=0x123456',()=>{
    const hex = 0x123456
    const bytes = uint2bytesBE(hex,3)
    const int = bytes2uintBE(bytes)
    expect(int).toBe(hex)
  })

  test('bytes2uintLE(uint2bytesLE(0x123456,3))=0xFF3456',()=>{
    const hex = 0xFF3456
    const bytes = uint2bytesLE(hex,3)
    const int = bytes2uintLE(bytes)
    expect(int).toBe(hex)
  })

  test('bytes2intBE(int2bytesBE(-0x123456,3))=-0x123456',()=>{
    const hex = -0x123456
    const int = bytes2intBE(int2bytesBE(hex,3))
    expect(int).toBe(hex)
  })

  test('bytes2intLE(int2bytesLE(-0x123456,3))=-0x123456',()=>{
    const hex = -0x123456
    const int = bytes2intLE(int2bytesLE(hex,3))
    expect(int).toBe(hex)
  })

})