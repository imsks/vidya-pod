import { model, models, Schema, type Model } from "mongoose";

export interface StudentDocument {
  name: string;
  phone: string;
  standard: string;
  image_url?: string;
  created_at: Date;
}

const StudentSchema = new Schema<StudentDocument>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    standard: { type: String, required: true },
    image_url: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "students",
  },
);

const Student: Model<StudentDocument> =
  models.Student || model<StudentDocument>("Student", StudentSchema);

export default Student;
