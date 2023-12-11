import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connectDataBase from "./database.js";
import User from "./models/user.js";
import Post from "./models/post.js";

connectDataBase();

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`===========================================`);
  console.log(`Apna Facebook app listening on port ${port}`);
  console.log(`===========================================`);
});

app.post("/singup", async (request, response) => {
  console.log("check ", request.body);
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
  console.log(request.body);
  const post = await Post.create(request.body);
  console.log(post.content);
  response.send({
    isSuccess: true,
    message: "apka post success ho gaya hai",
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
  await post.save();
  response.send({
    isSuccess: true,
    message: "data save ho gaya",
  });
});
