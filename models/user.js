import { Schema, model } from "mongoose";

const UserSchema = new Schema({
  name: {
    type: String,
  },
  mobileNumber: {
    type: Number,
  },
  birth: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  profilePicURL: {
    asset_id: String,
    resource_type: String,
    secure_url: String,
    url: String,
  },
  banner: {
    asset_id: String,
    resource_type: String,
    secure_url: String,
    url: String,
  },
  friendRequests: [
    {
      created: { type: Date },
      friend: { type: Schema.ObjectId, ref: "User" },
    },
  ],
  friendLists: [
    {
      created: { type: Date },
      friend: { type: Schema.ObjectId, ref: "User" },
    },
  ],
  notifications: {
    type: Map,
    of: {
      created: { type: Date },
      isSeen: { type: Boolean, default: false },
      action: { type: String },
      user: { type: Schema.ObjectId, ref: "User" },
      post: { type: Schema.ObjectId, ref: "Post" },
    },
    default: {},
    required: true,
  },
});

const User = model("User", UserSchema);

export default User;
