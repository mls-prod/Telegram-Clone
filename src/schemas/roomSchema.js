import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String || null },
    type: {
      type: String,
      enum: ["group", "private", "channel"],
      required: true,
    },
    admins: [{ type: Schema.ObjectId, ref: "User", required: true }],
    participants: [{ type: Schema.ObjectId, ref: "User", required: true }],
    creator: { type: Schema.ObjectId, ref: "User" },
    medias: [{ type: Schema.ObjectId, ref: "Media", required: true }],
    messages: [{ type: Schema.ObjectId, ref: "Message", required: true }],
    locations: [{ type: Schema.ObjectId, ref: "Location", required: true }],
    link: String,
    biography: String,
  },
  { timestamps: true }
);

const RoomSchema = mongoose.models.Room || mongoose.model("Room", schema);
export default RoomSchema;
