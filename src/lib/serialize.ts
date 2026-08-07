type MongoDocument = {
  _id: unknown;
  created_at?: Date | string;
  [key: string]: unknown;
};

const serializeDocument = <T extends MongoDocument>(
  doc: T,
): Omit<T, "_id"> & { id: string } => {
  const { _id, ...rest } = doc;

  return {
    ...rest,
    id: String(_id),
  } as Omit<T, "_id"> & { id: string };
};

export const serializeDocuments = <T extends MongoDocument>(
  docs: T[],
): Array<Omit<T, "_id"> & { id: string }> => docs.map(serializeDocument);
