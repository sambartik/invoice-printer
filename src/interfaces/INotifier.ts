export interface INotifier {
  notify(title: string, message: string): Promise<void>;
}
