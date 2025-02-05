import mongoose, { Schema, Document } from "mongoose";

export interface IVideo extends Document {
  title: string;
  link: string;
  userId: mongoose.Types.ObjectId;
  mimetype: string;
  size: number;
}

const VideoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IVideo>("Video", VideoSchema);
