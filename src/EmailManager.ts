import EventEmitter from 'events';
import imaps from 'imap-simple';
import libmime from 'libmime';
import logger from './logger';
import {IEmailManager, IIMAPSettings, IEmail, IAttachment} from './interfaces/IEmail';

class EmailManager extends EventEmitter implements IEmailManager {
  private settings: IIMAPSettings;

  private connection: any;

  private box: any;

  private nextID: number;

  constructor(settings: IIMAPSettings) {
    super();

    this.connection = null;
    this.box = null;
    this.nextID = -1;

    this.settings = settings;
  }

  public async connect(): Promise<boolean> {
    try {
      if (this.connection !== null) {
        logger.warn('Already connected to IMAP server!');
        return true;
      }

      logger.verbose(`Connecting to IMAP server (${this.settings.user})...`);

      this.connection = await imaps.connect({imap: this.settings});
      this.box = await this.connection.openBox('INBOX');
      this.nextID = this.box.uidnext;
      this.emit('ready');

      logger.debug(`Next message UID: ${this.nextID}`);

      this.connection.on('mail', this.onEmail.bind(this));
      this.connection.on('error', (error: any) => {
        logger.warn(`An error occured in IMAP connection: ${error.message}`);
        logger.warn(error.stack);
      });
      this.connection.on('close', () => {
        logger.warn('Connection closed! Trying to create a new connection.');

        this.connection = null;
        this.box = null;
        this.nextID = -1;
        this.connect();
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      logger.error(`An error occured while connecting to the email server: ${errorMessage}`);
      if (error instanceof Error) logger.error(error.stack);
      return false;
    }
  }

  private async fetchEmails(search: any[]): Promise<IEmail[]> {
    try {
      logger.info('Fetching emails...');
      logger.silly(`Using search parameters: ${search}`);

      const fetchOptions = {
        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
        struct: true,
        markSeen: false,
      };
      const rawEmails = await this.connection.search(search, fetchOptions);

      logger.silly(rawEmails);

      const emails = this.parseEmails(rawEmails);

      return emails;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      logger.error(`An error occured while fetching emails: ${errorMessage}`);
      if (error instanceof Error) logger.error(error.stack);
    }

    return [];
  }

  private async onEmail(num: number): Promise<void> {
    logger.debug(
      `New email(s) received from IMAP, using the nextUID to fetch the message: ${
        this.nextID
      }:${this.nextID + (num - 1)}`
    );
    const emails = await this.fetchEmails([['UID', `${this.nextID}:${this.nextID + (num - 1)}`]]);
    emails.forEach(email => this.emit('email', email));

    this.nextID += num;
  }

  private parseEmail(rawEmail: any): IEmail {
    try {
      logger.debug('Parsing email...');
      // Get metadata
      const from: string =
        rawEmail?.parts[0]?.body?.from !== undefined ? rawEmail?.parts[0]?.body?.from[0] : '';
      const to: string =
        rawEmail?.parts[0]?.body?.to !== undefined ? rawEmail?.parts[0]?.body?.to[0] : '';
      const subject: string =
        rawEmail?.parts[0]?.body?.subject !== undefined ? rawEmail?.parts[0]?.body?.subject : '';
      const date: string =
        rawEmail?.parts[0]?.body?.date !== undefined ? rawEmail?.parts[0]?.body?.date : '';

      // Get attachments
      const parts: any[] = imaps.getParts(rawEmail.attributes.struct);
      const attachmentParts: any[] = parts.filter(
        part => part?.disposition?.type?.toUpperCase() === 'ATTACHMENT'
      );

      logger.silly(`Email parts: ${parts}`);
      logger.silly(`Attachment parts: ${attachmentParts}`);

      const attachments: IAttachment[] = [];
      attachmentParts.forEach(attachmentPart => {
        // eslint-disable-next-line max-len
        const filename: string = libmime.decodeWords(
          attachmentPart?.disposition?.params?.filename || attachmentPart?.params?.name
        );
        const contentGetter = () => this.connection.getPartData(rawEmail, attachmentPart);

        const attachment: IAttachment = {
          filename,
          getData: contentGetter,
        };

        attachments.push(attachment);
      });

      // Stitch all data together

      const email: IEmail = {
        from,
        to,
        subject,
        date,
        attachments,
      };

      return email;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      logger.error(`An error occured while parsing email: ${errorMessage}`);
      if (error instanceof Error) logger.error(error.stack);

      throw error;
    }
  }

  private parseEmails(rawEmails: any[]): IEmail[] {
    // @ts-ignore
    return rawEmails.map(rawEmail => this.parseEmail(rawEmail)).filter(e => e !== null);
  }
}

export default EmailManager;
