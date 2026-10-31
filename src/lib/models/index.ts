/**
 * Database Models for Vidya Pod Application
 *
 * This file defines TypeScript interfaces for all database entities:
 * - Learner: Students/learners using the platform
 * - Sponsor: Individuals or organizations sponsoring learners
 * - Proctor: Proctors overseeing learner activities
 * - Teacher: Instructors teaching learners
 * - SponsorOrder: Orders/records of sponsorship transactions
 * - SponsorshipCart: A donor's selection of learners paid for with one checkout
 * - SponsorshipCartItem: A learner selected in a sponsorship cart
 */

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  created_at: string;
}

/**
 * Learner entity - Students/learners using the platform
 */
export interface Learner extends BaseEntity {
  name: string;
  phone?: string | null;
  standard: string;
  image_url?: string | null;
  sponsor_id?: string | null;
}

/**
 * Sponsor entity - Individuals or organizations sponsoring learners
 */
export interface Sponsor extends BaseEntity {
  name: string;
  email: string;
  phone: string;
  organization?: string | null;
  image_url?: string | null;
}

/**
 * Proctor entity - Proctors overseeing learner activities
 */
export interface Proctor extends BaseEntity {
  name: string;
  phone: string;
  qualification: string;
  image_url?: string | null;
}

/**
 * Teacher entity - Instructors teaching learners
 */
export interface Teacher extends BaseEntity {
  name: string;
  phone: string;
  qualification: string;
  image_url?: string | null;
}

/**
 * Sponsor order status types
 */
export type SponsorOrderStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";

/**
 * Sponsor plan types
 */
export type SponsorPlanType = "monthly" | "yearly";

/**
 * SponsorOrder entity - Orders/records of sponsorship transactions
 */
export interface SponsorOrder extends BaseEntity {
  order_id: string;
  name: string;
  email: string;
  phone: string;
  plan: SponsorPlanType;
  amount: number;
  status: SponsorOrderStatus;
  payment_session_id?: string | null;
  sponsor_id?: string | null;
  learner_id?: string | null;
  /** Cashfree order paying for this row when several learners share one checkout */
  payment_order_id?: string | null;
  cart_id?: string | null;
}

/**
 * Sponsorship cart status types
 */
export type SponsorshipCartStatus = "DRAFT" | "PENDING_PAYMENT" | "PAID" | "FAILED";

/**
 * SponsorshipCart entity - A donor's selection of learners paid for with one checkout
 */
export interface SponsorshipCart extends BaseEntity {
  status: SponsorshipCartStatus;
  plan: SponsorPlanType;
  order_id?: string | null;
  checkout_key?: string | null;
  amount?: number | null;
  payment_session_id?: string | null;
  checkout_started_at?: string | null;
}

/**
 * SponsorshipCartItem entity - A learner selected in a sponsorship cart
 */
export interface SponsorshipCartItem extends BaseEntity {
  cart_id: string;
  learner_id: string;
}

/**
 * Input types for creating entities (without auto-generated fields)
 */
export type LearnerInput = Omit<Learner, "id" | "created_at">;
export type SponsorInput = Omit<Sponsor, "id" | "created_at">;
export type ProctorInput = Omit<Proctor, "id" | "created_at">;
export type TeacherInput = Omit<Teacher, "id" | "created_at">;
export type SponsorOrderInput = Omit<SponsorOrder, "id" | "created_at">;

/**
 * Partial types for updating entities
 */
export type LearnerUpdate = Partial<LearnerInput>;
export type SponsorUpdate = Partial<SponsorInput>;
export type ProctorUpdate = Partial<ProctorInput>;
export type TeacherUpdate = Partial<TeacherInput>;
export type SponsorOrderUpdate = Partial<SponsorOrderInput>;

/**
 * Database table names
 */
export const DB_TABLES = {
  LEARNERS: "learners",
  SPONSORS: "sponsors",
  PROCTORS: "proctors",
  TEACHERS: "teachers",
  SPONSOR_ORDERS: "sponsor_orders",
  SPONSORSHIP_CARTS: "sponsorship_carts",
  SPONSORSHIP_CART_ITEMS: "sponsorship_cart_items",
} as const;

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES];
