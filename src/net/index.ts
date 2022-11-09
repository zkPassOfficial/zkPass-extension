import Tls from './tls'
chrome.runtime.onMessage.addListener(data => {
  console.log('onMessage', data)
  switch (data.action) {
    case 'clientHello':
      sendClientHello()
      break
    case 'xxx':
      console.log('xxx')
      // send()
      break
  }

})

async function sendClientHello(){
  const tls = new Tls('knljmfaeheifllbnnbepjibnjlecjekd','github.com',443)
  await tls.sendClientHello()
}