import * as unixprinter from 'unix-print';
import logger from './logger';
import {IPrinter} from './interfaces/IPrinter';

// Implements IPrinter
class UnixPrinter implements IPrinter {
  private printerName: string;

  // constructor
  constructor(printerName: string) {
    if (printerName === '') {
      throw new Error('Printer name cannot be null or empty');
    }

    this.printerName = printerName;
  }

  public async print(filename: string): Promise<void> {
    // Default values for settings
    // const settings = ["-o landscape", "-o media=A4", "-o fit-to-page", "-o sides=two-sided-long-edge"];
    const settings = [
      '-o media=A4',
      '-o sides=two-sided-long-edge',
      '-o fit-to-page',
      '-o XOutputColor=PrintAsGrayscale',
    ];

    logger.debug(`Printing file: ${filename} to printer: ${this.printerName}`);
    try {
      await unixprinter.print(filename, this.printerName, settings);
    } catch (error) {
      logger.error('An error occured while printing!');
      throw error;
    }
  }
}

export default UnixPrinter;
