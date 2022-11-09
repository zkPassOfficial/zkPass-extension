export interface KycTemplate{
  node: NodeInfo
}
export interface NodeInfo {
  ip: string;
  port: number;
  pubkey: Uint8Array;
  tid: string;
}