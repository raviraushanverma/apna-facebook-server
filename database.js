import mongoose from "mongoose";

const uriStringConnection =
  "mongodb+srv://raviraushanverma309:WUFRKv4UCpojDnxk@apna-facebook.ohtqcxn.mongodb.net/";

const connectDataBase = async () => {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uriStringConnection, {
      dbName: "apna-facebook",
    });
    console.log("MongoDB Connected!");
  } catch (error) {
    console.log(error);
  }
};

export default connectDataBase;
