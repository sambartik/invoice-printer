import {EventEmitter} from 'events';

export interface IAttachment {
  filename: string;
  getData: () => Promise<Buffer>;
}

export interface IEmail {
  from: string;
  to: string;
  subject: string;
  date: string;
  attachments: IAttachment[];
}

export interface IIMAPSettings {
  host: string;
  port: number;
  tls: boolean;
  user: string;
  password: string;
}

// Events: email, error, ready
export interface IEmailManager extends EventEmitter {
  connect(): Promise<boolean>;
}
