import { model, models, Schema, type Model } from "mongoose";

export interface ProctorDocument {
  name: string;
  phone: string;
  qualification: string;
  image_url?: string;
  created_at: Date;
}

const ProctorSchema = new Schema<ProctorDocument>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    qualification: { type: String, required: true },
    image_url: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "proctors",
  },
);

const Proctor: Model<ProctorDocument> =
  models.Proctor || model<ProctorDocument>("Proctor", ProctorSchema);

export default Proctor;
