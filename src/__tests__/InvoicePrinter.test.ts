import EventEmitter from 'events';
import InvoicePrinter from '../InvoicePrinter';
import UnixPrinter from '../UnixPrinter';
import PDFParser from '../PDFParser';
import PushoverNotifier from '../PushoverNotifier';
import {FilterType} from '../interfaces/IFilters';

jest.mock('../logger');
jest.mock('../UnixPrinter');
jest.mock('../PDFParser');
jest.mock('../PushoverNotifier');

jest.mock('fs-extra');
jest.mock('path');

const MockedPrinter = UnixPrinter as jest.MockedClass<any>;
const MockedPdfParser = PDFParser as jest.MockedClass<any>;
const MockedNotifier = PushoverNotifier as jest.MockedClass<any>;

const createMockedEmailManager = () => {
  const mockedEmailManager = new EventEmitter() as jest.MockedClass<any>;
  mockedEmailManager.connect = jest.fn(() => Promise.resolve(true));

  return mockedEmailManager;
};

const mockedPrinter: any = new MockedPrinter();
const mockedPdfParser: any = new MockedPdfParser();
const mockedNotifier: any = new MockedNotifier();
let mockedEmailManager: any;

describe('InvoicePrinter', () => {
  let invoicePrinter: InvoicePrinter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedEmailManager = createMockedEmailManager();
    invoicePrinter = new InvoicePrinter(mockedEmailManager, mockedPrinter, mockedPdfParser, [
      mockedNotifier,
    ]);
  });

  it('should be able to add filters', () => {
    const unsafeInvoicePrinter = invoicePrinter as any;
    const startingLength = unsafeInvoicePrinter.filters.length;

    invoicePrinter.addFilter({
      type: FilterType.METADATA,
      description: 'A description?',
      run: () => true,
    });

    invoicePrinter.addFilter({
      type: FilterType.ATTACHMENT,
      description: 'A description?',
      run: () => true,
    });

    invoicePrinter.addFilter({
      type: FilterType.PDF,
      description: 'A description?',
      run: () => true,
    });

    expect(unsafeInvoicePrinter.filters).toHaveLength(startingLength + 3);
  });

  it('should be able to remove filters', () => {
    const unsafeInvoicePrinter = invoicePrinter as any;
    const startingLength = unsafeInvoicePrinter.filters.length;

    const filter = {
      type: FilterType.METADATA,
      description: 'A description?',
      run: () => true,
    };

    invoicePrinter.addFilter(filter);

    expect(unsafeInvoicePrinter.filters).toHaveLength(startingLength + 1);

    invoicePrinter.removeFilter(filter);

    expect(unsafeInvoicePrinter.filters).toHaveLength(startingLength);
  });

  it('should filter out wrong emails', () => {
    const unsafeInvoicePrinter = invoicePrinter as any;
    unsafeInvoicePrinter.filters = [];

    const filter = {
      type: FilterType.METADATA,
      description: 'A description?',
      run: () => false,
    };

    invoicePrinter.addFilter(filter);

    const email = {
      attachments: [],
      subject: 'A subject',
    };

    expect(unsafeInvoicePrinter.filter(filter.type, email)).toEqual('A description?');
  });

  it('should not filter out correct emails', () => {
    const unsafeInvoicePrinter = invoicePrinter as any;
    unsafeInvoicePrinter.filters = [];

    const filter = {
      type: FilterType.PDF,
      description: 'A description?',
      run: () => true,
    };

    invoicePrinter.addFilter(filter);

    const email = {
      attachments: [],
      subject: 'A subject',
    };

    expect(unsafeInvoicePrinter.filter(filter.type, email)).toBeNull();
  });

  it('should print invoices from email attachment and notify when all filters are passing', async () => {
    const unsafeInvoicePrinter = invoicePrinter as any;
    const email = {
      attachments: [
        {
          filename: 'invoice.pdf',
          getData: () => Promise.resolve('A PDF'),
        },
      ],
      subject: 'A subject',
      from: 'From',
      to: 'To',
      date: 'Date',
    };

    const document = {
      numberOfPages: 1,
      content: 'invoice content',
    };

    unsafeInvoicePrinter.pdfParser.parse.mockImplementationOnce(() => Promise.resolve(document));

    mockedEmailManager.emit('email', email);

    await new Promise(process.nextTick);

    expect(mockedNotifier.notify).toHaveBeenCalledTimes(1);
    expect(mockedPrinter.print).toHaveBeenCalledTimes(1);
  });
});
