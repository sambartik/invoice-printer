/* eslint-disable no-param-reassign */
import simpleImap from 'imap-simple';
import Chance from 'chance';
import EventEmitter from 'events';
import EmailManager from '../EmailManager';
import {IEmail, IIMAPSettings} from '../interfaces/IEmail';

jest.mock('../logger');

const chance = new Chance();

const mockedMailHandler = jest.fn();
const mockedErrorHandler = jest.fn();
let mockedConnection: any;

const createMockedConnection = () => {
  mockedConnection = new EventEmitter();
  mockedConnection.openBox = jest.fn(() => Promise.resolve({uidnext: 0}));
  mockedConnection.search = jest.fn(() => Promise.resolve([]));

  const old = mockedConnection.on.bind(mockedConnection);
  mockedConnection.on = (e: any, cb: any) => {
    const originalCb = cb;
    if (e === 'mail') cb = (...args: any[]) => mockedMailHandler(originalCb, ...args);
    if (e === 'error') cb = (...args: any[]) => mockedErrorHandler(originalCb, ...args);

    return old(e, cb);
  };

  return mockedConnection;
};
jest.mock('imap-simple', () => ({
  connect: jest.fn(() => Promise.resolve(createMockedConnection())),
}));
const mockedSimpleImap = simpleImap as jest.MockedFunction<any>;

let imapSettings: IIMAPSettings;
let emailManager: EmailManager;

beforeEach(() => jest.clearAllMocks());

describe('EmailManager', () => {
  beforeEach(async () => {
    imapSettings = {
      host: chance.string(),
      port: chance.integer(),
      user: chance.string(),
      password: chance.string(),
      tls: chance.bool(),
    };
    emailManager = new EmailManager(imapSettings);
    await emailManager.connect();
  });

  it('should initialize simple imap package', () => {
    expect(mockedSimpleImap.connect).toHaveBeenCalledWith({
      imap: imapSettings,
    });
  });

  it('should re-emit an event with an IEmail object after receiving email from IMAP', async () => {
    // Call from the mocked mail handler original implementation.
    mockedMailHandler.mockImplementationOnce((cb, ...args) => cb.apply(emailManager, args));
    mockedConnection.search.mockImplementationOnce(() => Promise.resolve([{}]));

    const parsedEmail: IEmail = {
      from: chance.string(),
      to: chance.string(),
      subject: chance.string(),
      date: chance.string(),
      attachments: [],
    };

    (emailManager as any).parseEmail = jest.fn(() => parsedEmail);

    const mockedEmit = jest.fn();
    emailManager['emit'] = mockedEmit;

    mockedConnection.emit('mail');
    await new Promise(process.nextTick);

    expect(mockedEmit).toHaveBeenCalledWith('email', parsedEmail);
  });

  it('should handle incomming email from IMAP server', async () => {
    mockedConnection.emit('mail');
    expect(mockedMailHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle error comming from IMAP server', async () => {
    mockedConnection.emit('error');
    expect(mockedErrorHandler).toHaveBeenCalledTimes(1);
  });

  it('should try to reconnect after a connection was closed', () => {
    emailManager.connect = jest.fn();
    mockedConnection.emit('close');
    expect(emailManager.connect).toHaveBeenCalledTimes(1);
  });

  it('should handle errors while fetching emails', async () => {
    mockedConnection.search.mockImplementationOnce(() => Promise.reject(new Error('test')));
    await expect(emailManager['fetchEmails']([])).resolves.toStrictEqual([]);
  });
});

describe('Connection', () => {
  beforeEach(() => {
    imapSettings = {
      host: chance.string(),
      port: chance.integer(),
      user: chance.string(),
      password: chance.string(),
      tls: chance.bool(),
    };
    emailManager = new EmailManager(imapSettings);
  });

  it('should return true if connection was successfull', () => {
    mockedSimpleImap.connect.mockImplementationOnce(() =>
      Promise.resolve(createMockedConnection())
    );

    const connected = emailManager.connect();

    expect(connected).resolves.toBe(true);
  });

  it('should return false if connection was not successfull', () => {
    mockedSimpleImap.connect.mockImplementationOnce(() => Promise.reject());

    const connected = emailManager.connect();

    expect(connected).resolves.toBe(false);
  });
});
