import Pushover from 'pushover-notifications';
import {INotifier} from './interfaces/INotifier';

class PushoverNotifier implements INotifier {
  private pushover;

  constructor(user: string, token: string) {
    this.pushover = new Pushover({
      token,
      user,
    });
  }

  public async notify(title: string, message: string): Promise<void> {
    return this.pushover.send({
      title,
      message,
    });
  }
}

export default PushoverNotifier;
