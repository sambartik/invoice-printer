import Chance from 'chance';
import Pushover from 'pushover-notifications';
import PushoverNotifier from '../PushoverNotifier';

const MockedPushover = Pushover as jest.MockedFunction<any>;
const chance = new Chance();

// Used by PushoverNotifier
jest.mock('pushover-notifications');

describe('PushoverNotifier', () => {
  let pushoverNotifier: PushoverNotifier;
  let mockedPushoverInstance: jest.MockedClass<any>;
  beforeEach(() => {
    MockedPushover.mockClear();
    pushoverNotifier = new PushoverNotifier('user', 'token');
    mockedPushoverInstance = MockedPushover.mock.instances[0];
  });

  it('should initialize pushover package with provided arguments', () => {
    expect(MockedPushover).toHaveBeenCalledWith({
      token: 'token',
      user: 'user',
    });
  });

  it('should use send method from a package to notify', async () => {
    const title = chance.word();
    const message = chance.sentence();

    await pushoverNotifier.notify(title, message);
    expect(mockedPushoverInstance.send).toHaveBeenCalledWith({
      title,
      message,
    });
  });

  it('should throw an error if send method from a package throws an error', async () => {
    const title = chance.word();
    const message = chance.sentence();
    mockedPushoverInstance.send.mockImplementationOnce(() => {
      throw new Error('test');
    });

    await expect(pushoverNotifier.notify(title, message)).rejects.toThrowError('test');
  });
});
