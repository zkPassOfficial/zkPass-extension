import { SOCKET_APP_ID } from '../constants'
import MPCControler from '../mpc'
import { NodeInfo } from '../mpc/types'
import Tls from '../net/tls'

export default class HttpSession {
  headers: any
  node: NodeInfo
  constructor(headers: any, node: NodeInfo) {
    this.headers = headers
    this.node = node
  }

  async getResponse() {
    const { appId, host, port, requestHeader } = this.headers

    if (!this.checkServer()) {
      throw new Error('Can not connect to server, please check your message!')
    }

    const tls = new Tls(appId, host, port)

    const mpc = new MPCControler(this.node, requestHeader.length)

    await mpc.init()


  }

  checkServer() {
    if (!this.node) {
      return false
    }

    const { ip, port } = this.node
    const tls = new Tls(SOCKET_APP_ID, ip, port)
    tls.createClientHello()

    return true
  }

  async getCurrentUrl() {
    const tab: chrome.tabs.Tab = await new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true }, (t) => {
        resolve(t[0])
      })
    })
    return tab.url
  }

  parseResponse(response: any) {

  }

  generateHeaders() {
    return {}
  }

}