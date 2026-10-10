import { describe, expect, it } from "vitest";
import {
  DB_TABLES,
  type Learner,
  type Sponsor,
  type Proctor,
  type Teacher,
  type SponsorOrder,
  type LearnerInput,
  type SponsorInput,
  type ProctorInput,
  type TeacherInput,
  type SponsorOrderInput,
} from "@/lib/models";

describe("DB Models", () => {
  describe("DB_TABLES constant", () => {
    it("contains all required table names", () => {
      expect(DB_TABLES.LEARNERS).toBe("learners");
      expect(DB_TABLES.SPONSORS).toBe("sponsors");
      expect(DB_TABLES.PROCTORS).toBe("proctors");
      expect(DB_TABLES.TEACHERS).toBe("teachers");
      expect(DB_TABLES.SPONSOR_ORDERS).toBe("sponsor_orders");
    });

    it("has correct number of tables", () => {
      expect(Object.keys(DB_TABLES)).toHaveLength(5);
    });
  });

  describe("Learner type", () => {
    it("can create a valid learner object", () => {
      const learner: Learner = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Asha Kumar",
        phone: "9999999999",
        standard: "8",
        image_url: "https://example.com/avatar.jpg",
        sponsor_id: "550e8400-e29b-41d4-a716-446655440001",
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(learner.name).toBe("Asha Kumar");
      expect(learner.standard).toBe("8");
      expect(learner.sponsor_id).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    it("allows optional fields to be null", () => {
      const learner: Learner = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Asha Kumar",
        phone: "9999999999",
        standard: "8",
        image_url: null,
        sponsor_id: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(learner.image_url).toBeNull();
      expect(learner.sponsor_id).toBeNull();
    });
  });

  describe("Sponsor type", () => {
    it("can create a valid sponsor object", () => {
      const sponsor: Sponsor = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "John Doe",
        email: "john@example.com",
        phone: "9999999999",
        organization: "ACME Corp",
        image_url: "https://example.com/avatar.jpg",
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(sponsor.name).toBe("John Doe");
      expect(sponsor.email).toBe("john@example.com");
      expect(sponsor.organization).toBe("ACME Corp");
    });

    it("allows optional fields to be null", () => {
      const sponsor: Sponsor = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "John Doe",
        email: "john@example.com",
        phone: "9999999999",
        organization: null,
        image_url: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(sponsor.organization).toBeNull();
      expect(sponsor.image_url).toBeNull();
    });
  });

  describe("Proctor type", () => {
    it("can create a valid proctor object", () => {
      const proctor: Proctor = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Neha Singh",
        phone: "8888888888",
        qualification: "M.Ed",
        image_url: "https://example.com/avatar.jpg",
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(proctor.name).toBe("Neha Singh");
      expect(proctor.qualification).toBe("M.Ed");
    });
  });

  describe("Teacher type", () => {
    it("can create a valid teacher object", () => {
      const teacher: Teacher = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Ravi Sharma",
        phone: "7777777777",
        qualification: "B.Ed",
        image_url: "https://example.com/avatar.jpg",
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(teacher.name).toBe("Ravi Sharma");
      expect(teacher.qualification).toBe("B.Ed");
    });
  });

  describe("SponsorOrder type", () => {
    it("can create a valid sponsor order object", () => {
      const order: SponsorOrder = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        order_id: "VP_1234567890_abc123",
        name: "John Doe",
        email: "john@example.com",
        phone: "9999999999",
        plan: "monthly",
        amount: 400,
        status: "SUCCESS",
        payment_session_id: "session_12345",
        sponsor_id: "550e8400-e29b-41d4-a716-446655440001",
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(order.order_id).toBe("VP_1234567890_abc123");
      expect(order.plan).toBe("monthly");
      expect(order.status).toBe("SUCCESS");
      expect(order.amount).toBe(400);
    });

    it("accepts all valid status types", () => {
      const statuses: SponsorOrder["status"][] = ["PENDING", "SUCCESS", "FAILED"];
      statuses.forEach((status) => {
        const order: SponsorOrder = {
          id: "550e8400-e29b-41d4-a716-446655440000",
          order_id: "VP_1234567890_abc123",
          name: "John Doe",
          email: "john@example.com",
          phone: "9999999999",
          plan: "monthly",
          amount: 400,
          status,
          created_at: "2024-01-01T00:00:00Z",
        };
        expect(order.status).toBe(status);
      });
    });

    it("accepts all valid plan types", () => {
      const plans: SponsorOrder["plan"][] = ["monthly", "yearly"];
      plans.forEach((plan) => {
        const order: SponsorOrder = {
          id: "550e8400-e29b-41d4-a716-446655440000",
          order_id: "VP_1234567890_abc123",
          name: "John Doe",
          email: "john@example.com",
          phone: "9999999999",
          plan,
          amount: 400,
          status: "PENDING",
          created_at: "2024-01-01T00:00:00Z",
        };
        expect(order.plan).toBe(plan);
      });
    });
  });

  describe("Input types", () => {
    it("LearnerInput omits auto-generated fields", () => {
      const input: LearnerInput = {
        name: "Asha",
        phone: "9999999999",
        standard: "8",
      };

      // TypeScript compile-time check - id and created_at should not exist
      expect(input).not.toHaveProperty("id");
      expect(input).not.toHaveProperty("created_at");
    });

    it("SponsorInput omits auto-generated fields", () => {
      const input: SponsorInput = {
        name: "John",
        email: "john@example.com",
        phone: "9999999999",
      };

      expect(input).not.toHaveProperty("id");
      expect(input).not.toHaveProperty("created_at");
    });

    it("ProctorInput omits auto-generated fields", () => {
      const input: ProctorInput = {
        name: "Neha",
        phone: "9999999999",
        qualification: "M.Ed",
      };

      expect(input).not.toHaveProperty("id");
      expect(input).not.toHaveProperty("created_at");
    });

    it("TeacherInput omits auto-generated fields", () => {
      const input: TeacherInput = {
        name: "Ravi",
        phone: "9999999999",
        qualification: "B.Ed",
      };

      expect(input).not.toHaveProperty("id");
      expect(input).not.toHaveProperty("created_at");
    });

    it("SponsorOrderInput omits auto-generated fields", () => {
      const input: SponsorOrderInput = {
        order_id: "VP_123_abc",
        name: "John",
        email: "john@example.com",
        phone: "9999999999",
        plan: "monthly",
        amount: 400,
        status: "PENDING",
      };

      expect(input).not.toHaveProperty("id");
      expect(input).not.toHaveProperty("created_at");
    });
  });
});
