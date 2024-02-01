import { Schema, model } from "mongoose";

const NotificationSchema = new Schema({
  owner: { type: Schema.ObjectId, ref: "User" },
  created: { type: Date },
  action: {
    type: String,
    enum: [
      "POST_LIKED",
      "POST_COMMENTED",
      "FRIEND_REQUEST_CAME",
      "FRIEND_REQUEST_ACCEPTED",
    ],
  },
  isRead: { type: Boolean, default: false },
  user: { type: Schema.ObjectId, ref: "User" },
  post: { type: Schema.ObjectId, ref: "Post" },
  comment: { type: Schema.ObjectId },
});

NotificationSchema.index({ _id: 1, owner: 1 }, { unique: true }); // Compound index

// Index for fast query (Fast Sorting)
NotificationSchema.index({
  owner: 1,
  created: -1,
});

const Notification = model("Notification", NotificationSchema);

export default Notification;
