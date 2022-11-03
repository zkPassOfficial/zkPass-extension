// int

export function uint2bytesLE (value:number, byteLength:number) {
  value = +value
  byteLength = byteLength >>> 0

  const bytes = new Uint8Array(byteLength)

  let mul = 1
  let i = 0
  bytes[0] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    bytes[i] = (value / mul) & 0xFF
  }

  return bytes
}

export function uint2bytesBE(value:number,byteLength:number) {
  value = +value
  byteLength = byteLength >>> 0
  const bytes = new Uint8Array(byteLength)
  let i = byteLength - 1
  let mul = 1
  bytes[i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    bytes[i] = (value / mul) & 0xFF
  }

  return bytes
}

export function bytes2uintLE (bytes:Uint8Array) {

  const byteLength = bytes.length

  let val = bytes[0]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += bytes[0 + i] * mul
  }

  return val
}

export function bytes2uintBE (bytes:Uint8Array) {

  let byteLength = bytes.length

  let val = bytes[--byteLength]

  let mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += bytes[--byteLength] * mul
  }

  return val
}

// int
export function int2bytesLE(value:number,byteLength:number) {
  value = +value
  const bytes = new Uint8Array(byteLength)

  let i = 0
  let mul = 1
  let sub = 0
  bytes[0] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && bytes[ i - 1] !== 0) {
      sub = 1
    }
    bytes[i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return bytes
}

export function int2bytesBE(value:number,byteLength:number) {
  value = +value
  const bytes = new Uint8Array(byteLength)

  let i = byteLength - 1
  let mul = 1
  let sub = 0
  bytes[ i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && bytes[ i + 1] !== 0) {
      sub = 1
    }
    bytes[i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return bytes
}

export function bytes2intLE (bytes:Uint8Array) {
  const byteLength = bytes.length
  
  let val = bytes[0]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += bytes[0 + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

export function bytes2intBE (bytes:Uint8Array) {
  const byteLength = bytes.length
  let i = byteLength
  let mul = 1
  let val = bytes[0 + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += bytes[0 + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}