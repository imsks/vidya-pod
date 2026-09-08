import { describe, expect, it } from "vitest";
import Student from "./Student";
import SponsorOrder from "./SponsorOrder";

describe("Student model", () => {
  it("requires name, phone, and standard", async () => {
    const student = new Student({});

    await expect(student.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        name: expect.any(Object),
        phone: expect.any(Object),
        standard: expect.any(Object),
      }),
    });
  });

  it("accepts valid student data", async () => {
    const student = new Student({
      name: "Rahul",
      phone: "9876543210",
      standard: "10",
    });

    await expect(student.validate()).resolves.toBeUndefined();
  });
});

describe("SponsorOrder model", () => {
  it("requires core sponsor order fields", async () => {
    const order = new SponsorOrder({});

    await expect(order.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        order_id: expect.any(Object),
        name: expect.any(Object),
        email: expect.any(Object),
        phone: expect.any(Object),
        plan: expect.any(Object),
        amount: expect.any(Object),
      }),
    });
  });

  it("rejects invalid plan values", async () => {
    const order = new SponsorOrder({
      order_id: "VP_test",
      name: "Sponsor",
      email: "sponsor@example.com",
      phone: "9876543210",
      plan: "weekly",
      amount: 500,
    });

    await expect(order.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        plan: expect.any(Object),
      }),
    });
  });

  it("defaults status to PENDING", () => {
    const order = new SponsorOrder({
      order_id: "VP_test",
      name: "Sponsor",
      email: "sponsor@example.com",
      phone: "9876543210",
      plan: "monthly",
      amount: 500,
    });

    expect(order.status).toBe("PENDING");
  });

  it("rejects invalid status values", async () => {
    const order = new SponsorOrder({
      order_id: "VP_test",
      name: "Sponsor",
      email: "sponsor@example.com",
      phone: "9876543210",
      plan: "monthly",
      amount: 500,
      status: "UNKNOWN",
    });

    await expect(order.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        status: expect.any(Object),
      }),
    });
  });

  it("enforces unique order_id at schema level", () => {
    const orderIdPath = SponsorOrder.schema.path("order_id");

    expect(orderIdPath).toBeDefined();
    expect(orderIdPath?.options.unique).toBe(true);
  });
});
