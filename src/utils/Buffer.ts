// big endian uint buffer
export default class UintBuffer{
  bytes: Uint8Array
  buffer: ArrayBuffer

  constructor(size:number){

    //default buffer size is 128 bytes = 1024 bit = 1k 
    size = size || 128
    
    this.buffer = new ArrayBuffer(size)
    this.bytes = new Uint8Array(this.buffer)
  }

  setUint8Array(offset:number, value: Uint8Array){
    const maxLength = this.bytes.length - offset
    if(value.byteLength>maxLength){
      throw Error(`buffer overflow! last value offset(${offset + value.length}) > buffer size(${this.bytes.length})`)
    }else{
      this.bytes.set(value,offset)
    }
  }

  expand(size:number){
    size = size || 128
    const expanded_buffer = new Uint8Array(this.buffer,0,this.buffer.byteLength + size)
    this.buffer = expanded_buffer
    this.bytes = new Uint8Array(this.buffer)
  }

  // uint8
  appendUint8(value:number) {
    this.expand(1)
    this.setUint8(this.bytes.length-1,value)
  }

  setUint8(offset:number, value:number) {
    this.bytes[offset] = value 
  }

  getUint8(offset:number) {
    return this.bytes[offset]
  }

  // uint16
  appendUint16(value:number) {
    this.expand(2)
    this.setUint16(this.bytes.length-2,value)
  }

  setUint16(offset:number, value:number) {
    this.bytes[offset + 0] = value >>> 8
    this.bytes[offset + 1] = value
  }

  getUint16(offset:number) {
    const msb0 = this.bytes[offset + 0]
    const msb1 = this.bytes[offset + 1]
    return (msb0 << 8) | msb1
  }

  // uint24
  appendUint24(value:number) {
    this.expand(3)
    this.setUint24(this.bytes.length-3,value)
  }
    
  setUint24(offset:number, value:number) {
    this.bytes[offset + 0] = value >>> 16 
    this.bytes[offset + 1] = value >>> 8
    this.bytes[offset + 2] = value
  }
    
  getUint24(offset:number) {
    const msb0 = this.bytes[offset + 0]
    const msb1 = this.bytes[offset + 1]
    const msb2 = this.bytes[offset + 2]
    return ((msb0 << 16) >>> 0) | (msb1 << 8) | msb2
  }

  // uint32
  appendUint32(value:number) {
    this.expand(4)
    this.setUint32(this.bytes.length-4,value)
  }

  setUint32(offset:number, value:number) {
    this.bytes[offset + 0] = value >>> 24 
    this.bytes[offset + 1] = value >>> 16 
    this.bytes[offset + 2] = value >>> 8 
    this.bytes[offset + 3] = value
  }

  getUint32(offset:number) {
    const msb0 = this.bytes[offset + 0]
    const msb1 = this.bytes[offset + 1]
    const msb2 = this.bytes[offset + 2]
    const msb3 = this.bytes[offset + 3]
    return ((msb0 << 24) >>> 0) | (msb1 << 16) | (msb2 << 8) | msb3
  }

}