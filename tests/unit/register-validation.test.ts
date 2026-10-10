import { describe, expect, it } from "vitest";
import { getRegisterTable, parseRegisterBody } from "@/lib/validation/register";

describe("parseRegisterBody", () => {
  it("accepts a valid teacher payload", () => {
    const result = parseRegisterBody({
      role: "teacher",
      name: "Ravi",
      phone: "9999999999",
      qualification: "B.Ed",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("teacher");
      expect(result.data.qualification).toBe("B.Ed");
    }
  });

  it("rejects missing required fields", () => {
    const result = parseRegisterBody({ role: "teacher", name: "Ravi" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/required|phone/i);
    }
  });

  it("requires qualification for teachers and proctors", () => {
    const teacher = parseRegisterBody({
      role: "teacher",
      name: "Ravi",
      phone: "9999999999",
    });
    const proctor = parseRegisterBody({
      role: "proctor",
      name: "Neha",
      phone: "8888888888",
    });

    expect(teacher.success).toBe(false);
    expect(proctor.success).toBe(false);
  });

  it("rejects legacy student role", () => {
    const result = parseRegisterBody({
      role: "student",
      name: "Asha",
      phone: "9999999999",
      standard: "8",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown roles", () => {
    const result = parseRegisterBody({
      role: "admin",
      name: "X",
      phone: "1",
    });
    expect(result.success).toBe(false);
  });
});

describe("getRegisterTable", () => {
  it("maps roles to tables", () => {
    expect(getRegisterTable("teacher")).toBe("teachers");
    expect(getRegisterTable("proctor")).toBe("proctors");
  });
});
