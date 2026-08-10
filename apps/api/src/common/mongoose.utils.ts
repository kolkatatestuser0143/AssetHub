// Shapes lean Mongoose documents into the API DTO shape the frontend
// already consumes (Prisma exposed `id`). Documents use string `_id`
// (ObjectId-hex) with versionKey disabled, so the mapping is trivial.
// Every service must serialize through these before returning data.
//
// The helpers are intentionally typed loosely: Mongoose's lean() types
// do not infer cleanly through a `T extends { _id }` generic, and the
// DTO shape is a plain object passed to JSON. Services own the real
// typing at their public boundaries.

export function toDto(doc: any): any {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}

export function toDtoArray(docs: any[]): any[] {
  return docs.map((doc) => toDto(doc));
}
