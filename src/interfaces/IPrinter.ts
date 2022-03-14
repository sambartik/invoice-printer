export interface IPrinter {
  print(text: string): Promise<void>;
}
