import pdf from 'pdf-parse';
import logger from './logger';
import {IPDFParser, IPDFDocument} from './interfaces/IPDF';

class PDFParser implements IPDFParser {
  // eslint-disable-next-line class-methods-use-this
  public async parse(buffer: Buffer): Promise<IPDFDocument> {
    if (buffer.length === 0) {
      throw new Error('Buffer is empty!');
    }

    logger.debug('Parsing PDF file...');
    const parsedData = await pdf(buffer);
    const document: IPDFDocument = {
      numberOfPages: parsedData.numpages,
      content: parsedData.text,
      raw: buffer,
    };

    logger.silly(document);

    return document;
  }
}

export default PDFParser;
