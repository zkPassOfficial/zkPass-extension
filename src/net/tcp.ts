import Buffer from '../utils/buffer'

enum StatusCode {
  SUCCESS = 0,
  ERROR = 1
}

export enum ConnectState {
  CLOSED = 0,
  CLOSING = 1,
  CONNECTING = 8,
  CONNECTED = 9,
}

const DeadLineTime = 15 * 1000

export default class Tcp{
  socketProxy: string
  host: string
  port: number
  socketId: number
  state: ConnectState
  currentState?: ConnectState
  timer: any
  buffer: Buffer

  constructor(socketProxy: string, host: string, port: number) {
    this.socketProxy = socketProxy
    this.host = host
    this.port = port
    
    this.socketId = 0
    this.buffer = new Buffer()
    this.state = ConnectState.CLOSED
  }

  str2ba(str:string) {
    const ba = []
    for (let i = 0; i < str.length; i++) {
      ba.push(str.charCodeAt(i))
    }
    return ba
  }


  async _sendMessage( data: object) {
    
    const res = await chrome.runtime.sendMessage(this.socketProxy, data)
    //error occurred
    if (chrome.runtime.lastError || res.code !== StatusCode.SUCCESS) {
      console.log(res.code,res.error)
      //todo transfer the error to render
      // chrome.runtime.sendMessage(res.data)
    }

    return res
  }

  async connect() {

    if(this.state !== ConnectState.CLOSED){
      return
    }

    this.state = ConnectState.CONNECTING
    const timeout = setTimeout(() => {
      this.state = ConnectState.CLOSED
      throw new Error('connect time out')
    }, DeadLineTime)

    const res = await this._sendMessage({ action: 'connect', host: this.host, port: this.port })

    clearTimeout(timeout)

    this.socketId = res.data
    this.state = ConnectState.CONNECTED

    this.timer = setInterval(async () => {
      const data = await this.receive()
      if(data && Object.keys(data).length>0){
        this.buffer.writeBytes(new Uint8Array(Object.values(data)))

        console.log('tcp:receive chunk',Object.values(data),Object.values(data).length)
        console.log('tcp:receive buffer',this.buffer)
      }
    }, 2000)

    return res.data
  }

  async receive() {
    if(this.state === ConnectState.CONNECTED){
      const res = await this._sendMessage({ action: 'drain', socketId: this.socketId })
      //sender bytes: [69, 99, 104, 111, 32]
      //res.data: {0: 69, 1: 99, 2: 104, 3: 111, 4: 32}
      return res.data
    }else{
      console.error('Connection Error',this.state)
    }
  }

  async send(data: Array<number>) {
    if(this.state === ConnectState.CONNECTED){
      const res = await this._sendMessage({ action: 'send', socketId: this.socketId, data })
      return res.data
    }
    else{
      console.error('Connection Error',this.state)
    }
  }

  async close() {   
    console.log('TCP: close')
    if(this.state === ConnectState.CONNECTED){
      this.state = ConnectState.CLOSING
      await this._sendMessage({ action: 'close', socketId: this.socketId })
      this.state = ConnectState.CLOSED
      clearInterval(this.timer)
      this.buffer.drain()
      this.socketId = 0
    }
    else{
      console.log('Connection Error',this.state)
    }
  }

}