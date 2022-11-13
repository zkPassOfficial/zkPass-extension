const BUFFER_GROW_SIZE = 128 // 128 bytes = 1K
const MAX_SIZE = 128 * 1024 * 10 // max buffer size is 10M

/**
 * BigEndian buffer
 */
export default class Buffer{
  bytes: Uint8Array
  offset: number //write offset
  cursor: number //read cursor

  constructor(options?:{bytes?:Uint8Array,byteLength?:number}){
    if(options?.bytes){
      this.bytes = options.bytes
    }else if(options?.byteLength){
      const byteLength = options.byteLength >>>0
      this.bytes = new Uint8Array(byteLength)
    }else{
      this.bytes = new Uint8Array(BUFFER_GROW_SIZE)
    }
    this.offset = 0
    this.cursor = 0
  }

  drain(){
    const bytes = this.peekBytes(0,this.offset) //this.region(0,this.offset)
    this.bytes = new Uint8Array(BUFFER_GROW_SIZE)
    this.offset = 0
    this.cursor = 0
    return bytes
  }

  grow(size: number){
    const newSize = this.bytes.length+size
    if(newSize>MAX_SIZE){
      throw new Error('buffer grows over 10M.')
    }
    const bytes = new Uint8Array(newSize)
    bytes.set(this.bytes,0)
    this.bytes = bytes
  }

  region(begin:number,byteLength:number){
    const chunk = new Buffer({byteLength})
    chunk.writeBytes(this.peekBytes(begin,byteLength))
    return chunk
  }

  shift(size: number){
    // size = size>>>0
    // if(size>=this.bytes.length){
    //   return this.drain()
    // }else{
    // console.log('before shift',this.bytes,this.bytes.length,this.offset,this.cursor)
    const head = this.bytes.slice(0, size)
    const tail = this.bytes.slice(size)
    this.bytes = tail
    this.cursor = Math.max(0,this.cursor-size)
    this.offset = Math.max(0,this.offset-size)
    // console.log('after shift head',head)
    // console.log('after shift tail',this.bytes,this.bytes.length,this.offset,this.cursor)
    return new Buffer({bytes:head})
    // }
  }

  seek(pos:number){
    this.cursor = pos
  }

  write(value: number, byteLength: number) {
    value = +value
    byteLength = byteLength >>> 0
    
    if(this.offset + byteLength > this.bytes.length){
      const size = Math.max(BUFFER_GROW_SIZE, byteLength)
      this.grow(size)
    }
    
    let i = byteLength - 1
    let mul = 1
    this.bytes[this.offset + i] = value & 0xFF
    while (--i >= 0 && (mul *= 0x100)) {
      this.bytes[this.offset + i] = (value / mul) & 0xFF
    }
    this.offset += byteLength
  }

  writeBytes(bytes: Uint8Array) {
    
    const byteLength = bytes.length
    
    if(this.offset + byteLength > this.bytes.length){
      const size = Math.max(BUFFER_GROW_SIZE, byteLength)
      this.grow(size)
    }

    this.bytes.set(bytes,this.offset)
    this.offset += byteLength
  }

  writeUint8(value: number){
    this.write(value,1)
  }

  writeUint16(value: number){
    this.write(value,2)
  }

  writeUint24(value: number){
    this.write(value,3)
  }

  writeUint32(value: number){
    this.write(value,4)
  }

  read(byteLength: number){

    if(byteLength ==0){
      throw 'can not read 0 length byte'
    }

    let offset = byteLength >>> 0

    let val = this.bytes[this.cursor + --offset]
    let mul = 1

    while (offset > 0 && (mul *= 0x100)) {
      val += this.bytes[this.cursor + --offset] * mul
    }

    this.cursor += byteLength
    return val
  }

  readBytes(byteLength: number){
    const bytes = this.bytes.slice(this.cursor,this.cursor + byteLength)
    this.cursor += byteLength
    return bytes
  }

  readUint8(){
    return this.read(1)
  }

  readUint16(){
    return this.read(2)
  }

  readUint24(){
    return this.read(3)
  }

  readUint32(){
    return this.read(4)
  }

  peek(cursor:number, byteLength: number){
    let offset = byteLength >>> 0

    let val = this.bytes[cursor + --offset]
    let mul = 1

    while (offset > 0 && (mul *= 0x100)) {
      val += this.bytes[cursor + --offset] * mul
    }

    return val
  }
  
  peekBytes(begin:number,length:number){
    const end = begin+length
    // if(begin >= 0 && end < this.offset){
    return this.bytes.slice(begin, end)
    // }
  }

  peekUint8(cursor:number){
    return this.peek(cursor,1)
  }

  peekUint16(cursor:number){
    return this.peek(cursor,2)
  }

  peekUint24(cursor:number){
    return this.peek(cursor,3)
  }

  peekUint32(cursor:number){
    return this.peek(cursor,4)
  }

}