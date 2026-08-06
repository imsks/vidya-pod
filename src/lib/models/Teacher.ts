import { model, models, Schema, type Model } from "mongoose";

export interface TeacherDocument {
  name: string;
  phone: string;
  qualification: string;
  image_url?: string;
  created_at: Date;
}

const TeacherSchema = new Schema<TeacherDocument>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    qualification: { type: String, required: true },
    image_url: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "teachers",
  },
);

const Teacher: Model<TeacherDocument> =
  models.Teacher || model<TeacherDocument>("Teacher", TeacherSchema);

export default Teacher;
