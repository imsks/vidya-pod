import { model, models, Schema, type Model } from "mongoose";

export interface UserDocument {
  supabaseId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  provider: string;
  created_at: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    supabaseId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    fullName: { type: String },
    avatarUrl: { type: String },
    provider: { type: String, required: true, default: "google" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "users",
  },
);

const User: Model<UserDocument> =
  models.User || model<UserDocument>("User", UserSchema);

export default User;
