import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-2 py-1", "p-3");
    expect(result).toBe("p-3");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("should filter out falsy values", () => {
    const result = cn("base-class", false, null, undefined, "another-class");
    expect(result).toBe("base-class another-class");
  });

  it("should merge tailwind classes correctly", () => {
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toBe("bg-blue-500");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle arrays of classes", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  it("should handle object syntax", () => {
    const result = cn({ "class1": true, "class2": false, "class3": true });
    expect(result).toBe("class1 class3");
  });
});
