/*
 * A Typescript implementation of TLS.
 *
 * =======================FULL HANDSHAKE======================
 * Client                                               Server
 *
 * ClientHello                  -------->
 *                                                 ServerHello
 *                                                Certificate*
 *                                          ServerKeyExchange*
 *                                         CertificateRequest*
 *                              <--------      ServerHelloDone
 * Certificate*
 * ClientKeyExchange
 * CertificateVerify*
 * [ChangeCipherSpec]
 * Finished                     -------->
 *                                          [ChangeCipherSpec]
 *                              <--------             Finished
 * Application Data             <------->     Application Data
 *
 * =====================SESSION RESUMPTION=====================
 * Client                                                Server
 *
 * ClientHello                   -------->
 *                                                  ServerHello
 *                                           [ChangeCipherSpec]
 *                               <--------             Finished
 * [ChangeCipherSpec]
 * Finished                      -------->
 * Application Data              <------->     Application Data
*/

// export class TLS {
// constructor() { }

// createClientHello() { }

// sendHelloToServer() { }

// parseServerHello() { }

// parseCertificate() { }

// parseServerKeyExchange() { }

// receiveAndParseServerHello() { }

// createClientKeyExchange() { }

// createAndSendRequest() { }

// receiveAndParseResponse() { }

// clientFinished() { }

// serverFinished() { }
// }
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
  console.log('sending')
  await tls.sendClientHello()
  console.log('sent')
}