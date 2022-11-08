import { ACTION_TYPE } from '../constants'
import { NodeInfo } from '../mpc/types'
import HttpSession from './httpSession'
import RequestHandler from './requestHandler'
import { EventType } from './types'
import '../net'


export class Background {
  start() {
    chrome.runtime.onMessage.addListener(this.dispatchEvent)
  }

  dispatchEvent(data: EventType) {
    switch (data.action_type) {
      case ACTION_TYPE.CHECK_WEBSITE_INFO:
        return this.checkTabInfo(data.tmpId, data.node)
    }
  }

  async checkTabInfo(tmpId: string, node: NodeInfo) {
    const handler = new RequestHandler()
    await handler.init()
    const res = handler.parseResponse(handler.headers)
    const temp = await this.getCurrentTemplate(tmpId)
    const headers = handler.generateHeaders(res, temp)

    const session = new HttpSession(headers, node)

  }

  async getCurrentTemplate(id: string) {
    return new Promise(resolve => {
      chrome.storage.sync.get([ `temp-[${id}]` ], (res) => resolve(res))
    })
  }

}
console.log('zkpass extension installed!', new Date().toLocaleTimeString())
const background = new Background()

background.start()