export function concat(a:Uint8Array,b:Uint8Array){
  const buffer = new Uint8Array(a.length + b.length)
  buffer.set(a,0)
  buffer.set(b,a.length)
  return buffer
}