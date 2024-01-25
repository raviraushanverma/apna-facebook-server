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
});

const User = model("User", UserSchema);

export default User;
