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

export class TLS {
  constructor() { }

  createClientHello() { }

  sendHelloToServer() { }

  parseServerHello() { }

  parseCertificate() { }

  parseServerKeyExchange() { }

  receiveAndParseServerHello() { }

  createClientKeyExchange() { }

  createAndSendRequest() { }

  receiveAndParseResponse() { }

  clientFinished() { }

  serverFinished() { }
}