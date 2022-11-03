export const str2bytes = (s: string): Uint8Array => {
  const arr = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    arr[i] = s.charCodeAt(i)
  }
  return arr
}

export const bytes2str = (arr: Uint8Array): string => {
  let s = ''
  for (const a of arr) {
    s += String.fromCharCode(a)
  }
  return s
}