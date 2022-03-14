export enum FilterType {
  PDF,
  ATTACHMENT,
  METADATA,
}

export interface IFilter<T> {
  type: FilterType;
  run: (data: T) => boolean;
  description: string;
}
