import { describe, expect, it } from "vitest";
import { serializeDocuments } from "./serialize";

describe("serializeDocuments", () => {
  it("maps _id to id and preserves other fields", () => {
    const docs = [
      {
        _id: "507f1f77bcf86cd799439011",
        name: "Asha",
        phone: "9999999999",
        created_at: new Date("2026-01-01"),
      },
    ];

    expect(serializeDocuments(docs)).toEqual([
      {
        id: "507f1f77bcf86cd799439011",
        name: "Asha",
        phone: "9999999999",
        created_at: new Date("2026-01-01"),
      },
    ]);
  });
});
