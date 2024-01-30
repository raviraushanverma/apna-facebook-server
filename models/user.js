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
  friendRequests: {
    type: Map,
    default: {},
    required: true,
    of: {
      created: { type: Date },
      friend: { type: Schema.ObjectId, ref: "User" },
      notificationId: { type: Schema.ObjectId, ref: "Notification" },
    },
  },
  friendLists: {
    type: Map,
    default: {},
    required: true,
    of: {
      created: { type: Date },
      friend: { type: Schema.ObjectId, ref: "User" },
      notificationId: { type: Schema.ObjectId, ref: "Notification" },
    },
  },
});

const User = model("User", UserSchema);

export default User;
