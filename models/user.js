import { Schema, model } from "mongoose";
import { mediaType } from "../utils/helper.js";

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
  profilePicURL: mediaType,
  banner: mediaType,
  friendRequests: [
    {
      created: { type: Date },
      friend: { type: Schema.ObjectId, ref: "User" },
      notificationId: { type: Schema.ObjectId, ref: "Notification" },
    },
  ],
  friendLists: [
    {
      created: { type: Date },
      friend: { type: Schema.ObjectId, ref: "User" },
      notificationId: { type: Schema.ObjectId, ref: "Notification" },
    },
  ],
  notifications: {},
});

const User = model("User", UserSchema);

export default User;
