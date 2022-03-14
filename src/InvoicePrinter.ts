/* eslint-disable no-cond-assign */
import path from 'path';
import {v4 as uuid} from 'uuid';
import fs from 'fs-extra';
import logger from './logger';
import {IAttachment, IEmail, IEmailManager} from './interfaces/IEmail';
import {IPDFDocument, IPDFParser} from './interfaces/IPDF';
import {IPrinter} from './interfaces/IPrinter';
import {FilterType, IFilter} from './interfaces/IFilters';
import {INotifier} from './interfaces/INotifier';

class InvoicePrinter {
  public emailManager: IEmailManager;

  private printer: IPrinter;

  private pdfParser: IPDFParser;

  private notifiers: INotifier[] = [];

  private filters: IFilter<any>[] = [];

  constructor(
    emailManager: IEmailManager,
    printer: IPrinter,
    pdfParser: IPDFParser,
    notifiers: INotifier[]
  ) {
    this.pdfParser = pdfParser;
    this.printer = printer;
    this.emailManager = emailManager;
    this.notifiers = notifiers;

    this.addFilter({
      type: FilterType.METADATA,
      description: 'Has more than one attachment',
      run: (email: IEmail) => email.attachments.length > 0,
    });

    this.addFilter({
      type: FilterType.ATTACHMENT,
      description: 'Is a PDF file',
      run: (attachment: IAttachment) => attachment.filename.toLocaleLowerCase().endsWith('.pdf'),
    });

    this.emailManager.connect();
    this.emailManager.on('email', this.onEmail.bind(this));
    this.emailManager.on('ready', () => logger.info('Ready to receive emails.'));
  }

  private async onEmail(email: IEmail): Promise<void> {
    try {
      logger.info(`Checking email: ${email.subject}`);
      logger.silly(email);

      // Filter out metadata
      const metadataBlocking: string | null = this.filter(FilterType.METADATA, email);
      if (metadataBlocking) {
        logger.info(`The email was filtered out by filter: ${metadataBlocking}`);
        return;
      }

      // Filter out attachments
      email.attachments.forEach(async attachment => {
        const attachmentBlocking = this.filter(FilterType.ATTACHMENT, attachment);
        if (attachmentBlocking) {
          logger.info(`The attachment was filtered out by filter: ${attachmentBlocking}`);
          return;
        }

        // The attachment is OK to be parsed to PDF
        const pdfDocument = await this.pdfParser.parse(await attachment.getData());

        // Filter out PDF documents
        const pdfBlocking = this.filter(FilterType.PDF, pdfDocument);
        if (pdfBlocking) {
          logger.info(`The PDF document was filtered out by filter: ${pdfBlocking}`);
          return;
        }

        // The PDF document is OK to be printed - should be an invoice.

        this.print(email, pdfDocument);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      logger.error(
        `An error occured during the handling of an email by InvoicePrinter.ts: ${errorMessage}`
      );
      if (error instanceof Error) logger.error(error.stack);
    }
  }

  // Print correct PDF invoices.
  private async print(email: IEmail, document: IPDFDocument): Promise<void> {
    try {
      const filePath = path.resolve(
        __dirname,
        '../',
        process.env.TEMP_DIR || 'temp',
        `${uuid()}.pdf`
      );

      logger.debug(`Saving PDF file: ${filePath}`);
      await fs.outputFile(filePath, document.raw);

      await this.printer.print(filePath);
      // Send notifications
      this.notifiers.forEach(notifier =>
        notifier.notify('Tlačím novú faktúru!', `Od ${email.from}: ${email.subject}`)
      );

      logger.debug(`Deleting PDF file: ${filePath}`);
      await fs.remove(filePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      logger.error(`An error occured while printing PDF document: ${errorMessage}`);
      if (error instanceof Error) logger.error(error.stack);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private filter(type: FilterType, object: any): string | null {
    const filters = this.filters.filter(f => f.type === type);

    let reason: string | null = null;
    filters.some(filter => {
      if (!filter.run(object)) {
        reason = filter.description;
        return true;
      }

      return false;
    });

    return reason;
  }

  public addFilter(filter: IFilter<any>): void {
    this.filters = [...this.filters, filter];
  }

  public removeFilter(filter: IFilter<any>): void {
    this.filters = this.filters.filter(f => f !== filter);
  }
}

export default InvoicePrinter;
