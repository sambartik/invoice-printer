import unixprint from 'unix-print';
import Chance from 'chance';
import UnixPrinter from '../UnixPrinter';

const mockedUnixprint = unixprint as jest.MockedFunction<any>;
const chance = new Chance();

// Used by UnixPrinter
jest.mock('unix-print', () => ({
  print: jest.fn(() => Promise.resolve()),
}));
jest.mock('../logger');

describe('UnixPrinter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should print if all arguments are provided', async () => {
    const printerName = chance.word();
    const printer = new UnixPrinter(printerName);

    const filename = `${chance.word()}.pdf`;
    await printer.print(filename);

    expect(mockedUnixprint.print).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if an error occurs', async () => {
    mockedUnixprint.print.mockImplementationOnce(() => Promise.reject(new Error('test')));

    const printerName = chance.word();
    const filename = `${chance.word()}.pdf`;
    const printer = new UnixPrinter(printerName);

    await expect(printer.print(filename)).rejects.toThrow('test');
  });

  it('should throw an error if empty string was passed as a printer name', () => {
    expect(() => new UnixPrinter('')).toThrowError('Printer name cannot be null or empty');
  });
});
