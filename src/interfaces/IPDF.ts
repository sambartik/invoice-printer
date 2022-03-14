export interface IPDFDocument {
  numberOfPages: number;
  content: string;
  raw: Buffer;
}

export interface IPDFParser {
  parse(data: Buffer): Promise<IPDFDocument>;
}
