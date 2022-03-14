import './config';

import UnixPrinter from './UnixPrinter';
import EmailManager from './EmailManager';
import PDFParser from './PDFParser';
import InvoicePrinter from './InvoicePrinter';
import PushoverNotifier from './PushoverNotifier';

// Construct dependencies
if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASS) {
  throw new Error('IMAP settings not set!');
}
const emailManager = new EmailManager({
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT || '993', 10),
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASS,
  tls: process.env.TLS?.toLowerCase() === 'true' || true,
});

const printer = new UnixPrinter(process.env.PRINTER || '');
const pdfParser = new PDFParser();

const notifiers = [];
if (process.env.PUSHOVER_APPTOKEN && process.env.PUSHOVER_USERKEY) {
  notifiers.push(new PushoverNotifier(process.env.PUSHOVER_USERKEY, process.env.PUSHOVER_APPTOKEN));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const invoicePrinter = new InvoicePrinter(emailManager, printer, pdfParser, notifiers);

// Apply filters here
// invoicePrinter.addFilter(....);
