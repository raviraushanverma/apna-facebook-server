import { Schema, model } from "mongoose";

const PostSchema = new Schema({
  content: {
    type: String,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  medias: [
    {
      _id: String,
      asset_id: String,
      resource_type: String,
      secure_url: String,
      url: String,
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
  likes: {
    type: Map,
    of: String,
    default: {},
    required: true,
  },
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
      images: {
        id: {
          type: String,
        },
        url: {
          type: String,
        },
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
