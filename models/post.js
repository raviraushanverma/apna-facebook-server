import { Schema, model } from "mongoose";
import { mediaType } from "../utils/helper.js";

export const PostSchema = new Schema({
  content: {
    type: String,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  medias: [mediaType],
  likes: {
    type: Map,
    default: {},
    required: true,
    of: {
      created: { type: Date },
      userName: { type: String },
      notificationId: { type: Schema.ObjectId, ref: "Notification" },
    },
  },
  comments: [
    {
      id: { type: String },
      content: { type: String },
      owner: { type: Schema.ObjectId, ref: "User" },
      created: { type: Date },
      notificationId: { type: Schema.ObjectId, ref: "Notification" },
    },
  ],
  owner: { type: Schema.ObjectId, ref: "User" },
});
const Post = model("Post", PostSchema);

export default Post;
