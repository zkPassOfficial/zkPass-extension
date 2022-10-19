import { EventEmitter } from "events";

enum StatusCode {
  SUCCESS = 0,
  ERROR = 1
}

enum ConnectState {
  CONNECTED = "connected",
  CLOSED = "closed"
}

const DeadLineTime = 15 * 1000

export default class Tcp extends EventEmitter {
  appId: string;
  host: string;
  port: number;
  socketId: number;
  state: ConnectState;
  // buffer: Uint8Array;
  timer: any;
  currentState?: ConnectState

  constructor(appId: string, host: string, port: number) {
    super()
    this.appId = appId
    this.host = host
    this.port = port
    this.state = ConnectState.CLOSED
    this.socketId = 0
    // this.buffer = new Uint8Array()

    this.timer = setInterval(() => {
      if (this.state == ConnectState.CONNECTED) {
        this.receive()
      }
    }, 100)
  }

  async _sendMessage(data: object) {
    let res = await chrome.runtime.sendMessage(this.appId, data);
    return res;
  }

  setTimeout(timeout: number) {
    console.log("timeout", timeout)
  }

  async connect() {

    const timer = setTimeout(() => {
      throw new Error('connect time out');
    }, DeadLineTime)

    let res = await this._sendMessage({ action: "connect", host: this.host, port: this.port })

    clearTimeout(timer)

    if (chrome.runtime.lastError || res.code == StatusCode.ERROR) {
      throw new Error(res.mes);
    }

    this.socketId = res.mes
    this.state = ConnectState.CONNECTED

    return res.mes
  }

  async receive() {
    const res = await this._sendMessage({ action: "recv", socketId: this.socketId });

    if (chrome.runtime.lastError || res.code == StatusCode.ERROR) {
      throw new Error(res.mes);
    }

    if (res.mes.length > 0) {
      this.emit("data",res.mes)
    }
  }

  async send(data: Uint8Array) {
    const res = await this._sendMessage({ action: "send", socketId: this.socketId, data: Array.from(data) });

    if (chrome.runtime.lastError || res.code == StatusCode.ERROR) {
      throw new Error(res.mes);
    }

    return res.mes
  }

  async close() {
    const res = await this._sendMessage({ action: "close", socketId: this.socketId });
    this.state = ConnectState.CLOSED;
    clearInterval(this.timer);
    return res.mes
  }

}