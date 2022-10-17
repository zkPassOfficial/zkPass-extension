/**
 * A Salsa20 implementation with typescript
 */

import buffer from 'buffer'

interface SalsaOptions {
  doubleRounds?: number;
  rounds?: number;
  testing?: boolean;
}

export default class NodeSalsa20 {
  options: SalsaOptions | number
  coreFunc: (ina: Uint32Array, ret: Uint32Array) => void
  keyExpandBuffer_u32: Uint32Array
  counter: Uint32Array
  blockGenerator?: (ret: Uint32Array) => void
  encrypt?: (dataBuf: Iterable<number> | ArrayBuffer) => void
  decrypt?: (dataBuf: Iterable<number> | ArrayBuffer) => void
  seek?: (u32_0: number, u32_1: number) => void
  key?: ArrayBuffer
  nonce?: ArrayBuffer
  core?: (inaBuf: ArrayBuffer) => ArrayBuffer

  constructor(options: SalsaOptions | number) {
    this.options = options;

    const doubleRounds = determineDoubleRounds(options);
    this.coreFunc = CoreFunction(doubleRounds)

    this.keyExpandBuffer_u32 = new Uint32Array(16)
    this.counter = new Uint32Array(2)



    if ((options as SalsaOptions).testing) {
      console.debug("node-salsa20.js: Testing mode. Core function exposed.");
      this.core = (inaBuf: ArrayBuffer) => {
        var ret = new Uint32Array(16);
        this.coreFunc(new Uint32Array(inaBuf), ret);
        return ret.buffer;
      };
    }
  }
  setKey(bufKey: ArrayBuffer) {
    bufKey = inputarray(bufKey);

    let nonceBuf = null;

    if (bufKey.byteLength == 24 || bufKey.byteLength == 40) {
      console.warn("node-salsa20.js: Deprecated usage in specifying nonce during key() call. Please use `salsa20().key().nonce()`.");
      nonceBuf = bufKey.slice(0, 8);
      bufKey = bufKey.slice(8);
    }

    if (!(bufKey.byteLength == 16 || bufKey.byteLength == 32)) {
      throw Error("node-salsa20.js: Invalid key length. Should be 16 or 32 bytes. Got " + bufKey.byteLength + " bytes.");
    }

    this.key = bufKey;

    return this;
  }

  setNonce(nonce: Iterable<number> | ArrayBuffer) {
    nonce = inputarray(nonce);
    if (nonce.byteLength != 8 && nonce.byteLength != 16) {
      throw Error("node-salsa20.js: Invalid nonce length. Must be 8 or 16 bytes. Got " + nonce.byteLength + " bytes.");
    }

    if (!this.key) {
      throw Error("node-salsa20.js: Invalid key length. Should be 16 or 32 bytes. Got " + nonce.byteLength + " bytes.");
    }

    this._initialize(nonce.slice(0, 8), this.key);

    if (nonce.byteLength == 16) {
      const counterVal = new Uint32Array(nonce.slice(8, 16));
      this._seek(counterVal[0], counterVal[1]);
    }

    this._finalizeAndBindMethods();

    return this;
  }


  /* key expansion for 8 words(32 bytes) key */
  _salsa20BufferFillKey8(nonce2: Uint32Array, key8: Uint32Array) {
    let input = this.keyExpandBuffer_u32,
      sigma = new Uint32Array(
        [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]
      );

    input[0] = sigma[0];
    input[1] = key8[0];
    input[2] = key8[1];
    input[3] = key8[2];
    input[4] = key8[3];
    input[5] = sigma[1];

    input[6] = nonce2[0];
    input[7] = nonce2[1];

    input[10] = sigma[2];
    input[11] = key8[4];
    input[12] = key8[5];
    input[13] = key8[6];
    input[14] = key8[7];
    input[15] = sigma[3];
  }
  _salsa20ExpansionKey8(ret: Uint32Array) {
    const input = this.keyExpandBuffer_u32;

    input[8] = this.counter[0];
    input[9] = this.counter[1];

    return this.coreFunc(input, ret);
  };

  /* key expansion for 4 words key(16 bytes) */
  _salsa20BufferFillKey4(nonce2: Uint32Array, key4: Uint32Array) {
    const input = this.keyExpandBuffer_u32;
    const tau = new Uint32Array(
      [0x61707865, 0x3120646e, 0x79622d36, 0x6b206574]
    );

    input[0] = tau[0];
    input[1] = key4[0];
    input[2] = key4[1];
    input[3] = key4[2];
    input[4] = key4[3];
    input[5] = tau[1];

    input[6] = nonce2[0];
    input[7] = nonce2[1];

    input[10] = tau[2];
    input[11] = key4[0];
    input[12] = key4[1];
    input[13] = key4[2];
    input[14] = key4[3];
    input[15] = tau[3];
  };

  _salsa20ExpansionKey4(ret: Uint32Array) {
    const input = this.keyExpandBuffer_u32;

    input[8] = this.counter[0];
    input[9] = this.counter[1];

    return this.coreFunc(input, ret);
  };

  _counterReset() {
    this.counter[0] = 0;
    this.counter[1] = 0;
  };

  _counterInc() {
    this.counter[0] += 1;
    if (0 == this.counter[0]) this.counter[1] += 1;
  };

  _initialize(nonceBuf: ArrayBuffer, keyBuf: ArrayBuffer) {
    const nonce = new Uint32Array(nonceBuf);

    if (32 == keyBuf.byteLength) {
      const key = new Uint32Array(keyBuf);
      this._salsa20BufferFillKey8(nonce, key);

      this.blockGenerator = (ret: Uint32Array) => {
        this._salsa20ExpansionKey8(ret);
        this._counterInc();
      };
    } else if (16 == keyBuf.byteLength) {
      const key = new Uint32Array(keyBuf);
      this._salsa20BufferFillKey4(nonce, key);
      this.blockGenerator = (ret) => {
        this._salsa20ExpansionKey4(ret);
        this._counterInc();
      };
    } else
      throw new Error('invalid-key-length');
  };


  _xorBuf(dataBuf: Iterable<number> | ArrayBuffer) {
    dataBuf = inputarray(dataBuf);

    const origLength = dataBuf.byteLength,
      blocksCount = Math.floor(origLength / 64) + 1,
      block = new Uint32Array(16);    // holder of new generated block
    const stream = new Uint8Array(dataBuf),
      xorStream = new Uint8Array(stream.length + 64);
    let b = 0, i, j;

    for (i = 0; i < blocksCount; i++) {
      if (this.blockGenerator) this.blockGenerator(block);

      for (j = 0; j < 16; j++) {
        xorStream[b++] = (block[j] >> 0) & 0xff;
        xorStream[b++] = (block[j] >> 8) & 0xff;
        xorStream[b++] = (block[j] >> 16) & 0xff;
        xorStream[b++] = (block[j] >> 24) & 0xff;
      };
    };

    for (i = 0; i < origLength; i++) stream[i] ^= xorStream[i];
    return stream.buffer;
  };

  _seek(u32_0: number, u32_1: number) {
    this.counter[0] = u32_0;
    this.counter[1] = u32_1;
  };

  /*
      this.key: set up the key and initialize the inner buffer
      A single buffer is used as argument. It can be either 16 bytes or 32
      bytes for a single key, or (backwards compatible) 24 / 40 bytes where
      the first 8 bytes will be used as a nonce. The latter way is
      deprecated, though. Doing so will result in a warning.
  */

  _finalizeAndBindMethods() {
    this.encrypt = this._xorBuf;
    this.decrypt = this._xorBuf;
    this.seek = this._seek;
    delete this.key;
    delete this.nonce;
  }

};

export function toArrayBuffer(v: any) {
  if (isArrayBuffer(v)) return v;
  if (0 != v.length % 2) throw new Error('invalid-hex');
  v = v.replace(/[^0-9a-f]/ig, '').toLowerCase();
  var tableHEX = "0123456789abcdef";
  var cbuf = new Uint8Array(v.length / 2);
  for (var i = 0; i < cbuf.length; i++)
    cbuf[i] = tableHEX.indexOf(v[2 * i]) * 16 + tableHEX.indexOf(v[2 * i + 1]);
  return cbuf.buffer;
};

function determineDoubleRounds(options: SalsaOptions | number): number {
  let doubleRounds = 10;
  if (typeof options === "number") {
    console.warn(
      "node-salsa20.js: Deprecated specification of double-rounds. " +
      "For example, please use now `new Salsa20({ rounds: 20 })` or " +
      "`new Salsa20({ doubleRounds: 10 })` for Salsa20/20."
    );
    doubleRounds = options; // backwards compability
  } else {
    if (options.doubleRounds !== undefined && options.rounds !== undefined) {
      throw Error("Either specify option.doubleRounds or option.rounds, not both.");
    }
    if (options.doubleRounds) doubleRounds = options.doubleRounds;
    if (options.rounds) doubleRounds = options.rounds / 2;
  }
  if (!Number.isInteger(doubleRounds) || doubleRounds <= 0) {
    throw Error("Invalid value of rounds specified.");
  }
  return doubleRounds;
}

function CoreFunction(doubleRounds: number) {
  const x = new Uint32Array(16);

  function coreFunc(ina: Uint32Array, ret: Uint32Array) {
    function R(a: number, b: number) { return (((a) << (b)) | ((a) >>> (32 - (b)))); };
    // Salsa20 Core Word Specification
    var i; //ret = new Uint32Array(16);
    for (i = 0; i < 16; i++) x[i] = ina[i];

    for (i = 0; i < doubleRounds; i++) {
      x[4] ^= R(x[0] + x[12], 7); x[8] ^= R(x[4] + x[0], 9);
      x[12] ^= R(x[8] + x[4], 13); x[0] ^= R(x[12] + x[8], 18);
      x[9] ^= R(x[5] + x[1], 7); x[13] ^= R(x[9] + x[5], 9);
      x[1] ^= R(x[13] + x[9], 13); x[5] ^= R(x[1] + x[13], 18);
      x[14] ^= R(x[10] + x[6], 7); x[2] ^= R(x[14] + x[10], 9);
      x[6] ^= R(x[2] + x[14], 13); x[10] ^= R(x[6] + x[2], 18);
      x[3] ^= R(x[15] + x[11], 7); x[7] ^= R(x[3] + x[15], 9);
      x[11] ^= R(x[7] + x[3], 13); x[15] ^= R(x[11] + x[7], 18);
      x[1] ^= R(x[0] + x[3], 7); x[2] ^= R(x[1] + x[0], 9);
      x[3] ^= R(x[2] + x[1], 13); x[0] ^= R(x[3] + x[2], 18);
      x[6] ^= R(x[5] + x[4], 7); x[7] ^= R(x[6] + x[5], 9);
      x[4] ^= R(x[7] + x[6], 13); x[5] ^= R(x[4] + x[7], 18);
      x[11] ^= R(x[10] + x[9], 7); x[8] ^= R(x[11] + x[10], 9);
      x[9] ^= R(x[8] + x[11], 13); x[10] ^= R(x[9] + x[8], 18);
      x[12] ^= R(x[15] + x[14], 7); x[13] ^= R(x[12] + x[15], 9);
      x[14] ^= R(x[13] + x[12], 13); x[15] ^= R(x[14] + x[13], 18);
    };

    for (i = 0; i < 16; i++) ret[i] = x[i] + ina[i];
  };

  return coreFunc;

}

function isArrayBuffer(v: any) {
  return toString.apply(v) === '[object ArrayBuffer]';
}

function isUint8Array(v: any) {
  return toString.apply(v) === '[object Uint8Array]';
}

function inputarray(input: any) {
  if (!(
    isArrayBuffer(input) ||
    isUint8Array(input) ||
    buffer.Buffer.isBuffer(input)
  )) {
    throw Error("node-salsa20: Requires an input of ArrayBuffer, Uint8Array or Buffer.");
  }
  return new Uint8Array(buffer.Buffer.from(input)).buffer;
}

