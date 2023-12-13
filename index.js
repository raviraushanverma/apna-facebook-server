import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connectDataBase from "./database.js";
import User from "./models/user.js";
import Post from "./models/post.js";
import expressFileUpload from "express-fileupload";
import { v2 } from "cloudinary";

v2.config({
  cloud_name: "drwcm1tej",
  api_key: "138265649998732",
  api_secret: "a8fXTs9XX4FtcS6aLiebE3HFVJ8",
});

connectDataBase();

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(
  expressFileUpload({
    useTempFiles: true,
  })
);

app.listen(port, () => {
  console.log(`===========================================`);
  console.log(`Apna Facebook app listening on port ${port}`);
  console.log(`===========================================`);
});

app.get("/", async (request, response) => {
  response.send("Wow, Our API is working!!!!!");
});

app.post("/media-upload", async (request, response) => {
  try {
    const file = request.files.media;
    const media = await v2.uploader.upload(file.tempFilePath, {
      upload_preset: "ravi_raushan_ka_apna_facebook",
      public_id: "ravi_raushan_ka_apna_facebook",
    });
    response.send({
      isSuccess: true,
      message: "Media successfully uploaded",
      media: media,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `There are some errors while uploading the media: ${error}`,
    });
  }
});

app.post("/singup", async (request, response) => {
  const user = await User.findOne({ email: request.body.email });
  if (user === null) {
    await User.create(request.body);
    response.send({
      isSuccess: true,
      message: "apka account create ho gaya hai",
    });
  } else {
    response.send({
      isSuccess: false,
      message: "apka ye email se already account created hai ",
    });
  }
});

app.post("/login", async (request, response) => {
  const user = await User.findOne({
    email: request.body.email,
    password: request.body.password,
  });
  if (user !== null) {
    response.send({
      isSuccess: true,
      messsage: "app login ho chuke hai",
      user: user,
    });
  } else {
    response.send({
      isSuccess: false,
      message: "incorrect email or password",
    });
  }
});

app.post("/post", async (request, response) => {
  console.log("====>hello", request.body.images);
  const post = await Post.create(request.body);
  response.send({
    isSuccess: true,
    message: "apka post success ho gaya hai",
    post: post,
  });
});

app.get("/getData", async (request, response) => {
  const posts = await Post.find().sort({ created: -1 });
  response.send({
    isSuccess: true,
    message: "data aa gaya",
    posts: posts,
  });
});

app.post("/comment", async (request, response) => {
  const post = await Post.findById(request.body.id);

  post.comments.unshift(request.body.comments);
  console.log(post);
  await post.save();
  response.send({
    isSuccess: true,
    message: "data save ho gaya",
    post: post,
    id: post.comments,
  });
});

app.delete("/delete", async (request, response) => {
  console.log("===>hello", request.body);
});
