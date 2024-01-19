import { Schema, model } from "mongoose";

const PostSchema = new Schema({
  content: {
    type: String,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  videos: [
    {
      id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
  ],
  images: [
    {
      id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
  ],
  owner: {
    type: String,
  },
  taggedFriends: [
    {
      id: {
        type: String,
      },
      friend: {
        type: String,
      },
    },
  ],
  location: {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  likes: [
    {
      id: {
        type: String,
      },
      user: {
        type: String,
      },
    },
  ],
  comments: [
    {
      id: {
        type: String,
      },
      content: {
        type: String,
      },
      owner: {
        userId: { type: String },
        userName: { type: String },
      },
      created: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  owner: {
    userId: { type: String },
    userName: { type: String },
  },
});
const Post = model("Post", PostSchema);

export default Post;
