import { model, models, Schema, type Model } from "mongoose";

export const SPONSOR_PLANS = ["monthly", "yearly"] as const;
export const SPONSOR_STATUSES = ["PENDING", "SUCCESS", "FAILED"] as const;

export type SponsorPlan = (typeof SPONSOR_PLANS)[number];
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];

export interface SponsorOrderDocument {
  order_id: string;
  name: string;
  email: string;
  phone: string;
  plan: SponsorPlan;
  amount: number;
  status: SponsorStatus;
  payment_session_id?: string;
  cf_order_id?: string;
  paid_at?: Date;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

const SponsorOrderSchema = new Schema<SponsorOrderDocument>(
  {
    order_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    plan: {
      type: String,
      required: true,
      enum: SPONSOR_PLANS,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: SPONSOR_STATUSES,
      default: "PENDING",
    },
    payment_session_id: { type: String },
    cf_order_id: { type: String },
    paid_at: { type: Date },
    image_url: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "sponsor_orders",
  },
);

const SponsorOrder: Model<SponsorOrderDocument> =
  models.SponsorOrder ||
  model<SponsorOrderDocument>("SponsorOrder", SponsorOrderSchema);

export default SponsorOrder;
