export interface DOMMessage {
  action: string;
}

export interface DOMMessageResponse {
  title?: string;
  headlines?: Array<any>;
}

export interface EventType {
  action_type: string;
  [key: string]: any
}