import { concatArray } from "../utils";
import { SOCKET_APP_ID } from "../constants";


enum ConnectState {
  CONNECTED = "connected",
  CLOSED = "closed"
}

enum ActionType {
  CONNECT_SOCKET = "connect",
  CLOSE_SOCKET = "close",
  SEND_DATA = "send",
  REQUEST_DATA = "request"
}

const DeadLineTime = 15 * 1000

export default class Channel {
  name: string;
  port: number;
  buffer: Uint8Array;
  currentState?: ConnectState

  constructor(name: string, port: number) {
    this.name = name
    this.port = port
    this.buffer = new Uint8Array()
  }

  async connect() {
    const message = {
      action: ActionType.CONNECT_SOCKET,
      data: {
        server: this.name,
        port: this.port
      }
    }

    const timer = setTimeout(() => {
      throw new Error('connect time out');
    }, DeadLineTime)

    chrome.runtime.sendMessage(SOCKET_APP_ID, message, (response) => {

      clearTimeout(timer)

      if (chrome.runtime.lastError) {
        throw new Error(response.error || 'connection error');
      }

      if (response?.status === ConnectState.CONNECTED) {
        this.currentState = ConnectState.CONNECTED
        this.requestData()
        return this.currentState
      }
      return response?.data
    })
  }

  async requestData() {
    if (this.currentState === ConnectState.CLOSED) {
      return;
    }
    chrome.runtime.sendMessage(SOCKET_APP_ID, { action: ActionType.REQUEST_DATA }, (response) => {
      this.buffer = concatArray(this.buffer, new Uint8Array(response.data))
    });

    setTimeout(() => {
      this.requestData();
    }, 200);
  }

  async send(data: Uint8Array) {
    chrome.runtime.sendMessage(SOCKET_APP_ID, {
      action: ActionType.SEND_DATA,
      data: Array.from(data)
    });
  }

  async receive() {}

  _checkCompletedRequest(){}

  async close() {
    chrome.runtime.sendMessage(SOCKET_APP_ID, { action: ActionType.CLOSE_SOCKET }, (response) => {

      if (chrome.runtime.lastError) {
        throw new Error(response.error || 'close error');
      }

      if (response?.status === ConnectState.CLOSED) {
        this.currentState = ConnectState.CLOSED
        return this.currentState
      }
    })

  }
}