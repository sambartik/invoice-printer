import pdfParse from 'pdf-parse';
import Chance from 'chance';
import PDFParser from '../PDFParser';

const mockedPdfParse = pdfParse as jest.MockedObject<any>;
const chance = new Chance();

jest.mock('../logger');
jest.mock('pdf-parse', () =>
  jest.fn(buffer => {
    const obj = JSON.parse(buffer.toString());
    return Promise.resolve({
      text: obj.content,
      numpages: obj.numberOfPages,
    });
  })
);

describe('PDFParser', () => {
  const parser = new PDFParser();
  beforeEach(() => {
    mockedPdfParse.mockClear();
  });

  it('should call pdf parse package', async () => {
    await parser.parse(Buffer.from('{}'));

    expect(mockedPdfParse).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if the buffer is empty', async () => {
    await expect(parser.parse(Buffer.from(''))).rejects.toThrowError('Buffer is empty');
  });

  it('should throw an error if pdf parse package throws an error', async () => {
    mockedPdfParse.mockImplementationOnce(() => {
      throw new Error('test');
    });

    await expect(parser.parse(Buffer.from('test'))).rejects.toThrowError('test');
  });

  it('should return correct parsed data', async () => {
    const originalDocument: any = {
      numberOfPages: chance.integer(),
      content: chance.sentence(),
    };

    const parsedDocument = await parser.parse(Buffer.from(JSON.stringify(originalDocument)));

    expect(parsedDocument.content).toStrictEqual(originalDocument.content);
    expect(parsedDocument.numberOfPages).toStrictEqual(originalDocument.numberOfPages);
  });
});
