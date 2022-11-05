export default class RequestHandler {
  headers?: any

  async init() {
    const tab = await this.getCurrentTab()
    if (!tab.url) return
    chrome.webRequest.onBeforeRequest.addListener(this.beforeRequestCallback, {
      urls: [ '<all_urls>' ],
      tabId: tab.id,
    }, [ 'requestBody' ])

  }

  beforeRequestCallback(info: any) {
    this.headers = info
    chrome.webRequest.onSendHeaders.removeListener(this.beforeRequestCallback)
  }

  async getCurrentTab() {
    const tab: chrome.tabs.Tab = await new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true }, (t) => {
        resolve(t[0])
      })
    })
    return tab
  }

  parseResponse(response: any) { }

  generateHeaders(websiteInfo: any, template: any) {
    return {}
  }

}