import express, { request, response } from "express";
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

app.get("/", async (request, response) => {
  response.send("Wow, Our API is working!!!!!");
});

app.post("/sign_up", async (request, response) => {
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
  const post = await Post.create(request.body);
  response.send({
    isSuccess: true,
    message: "apka post success ho gaya hai",
    post: post,
  });
});

app.get("/posts", async (request, response) => {
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
    post: post,
    id: post.comments,
  });
});

app.delete(
  "/comment_delete/:post_id/:comment_id",
  async (request, response) => {
    const post = await Post.findById(request.params.post_id);
    const comment_id = post.comments.findIndex((comment) => {
      return request.params.comment_id == comment._id;
    });
    post.comments.splice(comment_id, 1);
    await post.save();
    response.send({
      isSuccess: true,
      message: "commented deleted ho gaya hai",
      post: post,
    });
  }
);

app.delete("/post_delete/:post_id/:user_id", async (request, response) => {
  const post = await Post.deleteOne({
    _id: request.params.post_id,
    "owner.userId": request.params.user_id,
  });

  response.send({
    isSuccess: true,
    message: "post delete ho gaya hai",
  });
});

app.post(
  "/post_like/:post_id/:user_id/:user_name",
  async (request, response) => {
    const post = await Post.findById(request.params.post_id);
    const keyCheck = post.likes.has(request.params.user_id);
    if (keyCheck === false) {
      post.likes.set(request.params.user_id, request.params.user_name);
      await post.save();
      response.send({
        isSuccess: true,
        message: "post like ho gaya hai",
      });
    } else {
      post.likes.delete(request.params.user_id);
      await post.save();
      response.send({
        isSuccess: false,
        message: "post like delete ho gaya hai",
      });
    }
  }
);
app.post("/comment_edit/:post_id/:comment_id", async (request, response) => {
  console.log(request.body);
  const post = await Post.findById(request.params.post_id);
  const index = post.comments.findIndex((element) => {
    return element._id == request.params.comment_id;
  });

  post.comments[index].content = request.body.content;
  await post.save();

  response.send({
    isSuccess: true,
    message: "edit ho gaya hai",
  });
});

app.get("/profile_post/:user_id", async (request, response) => {
  const posts = await Post.find({ "owner.userId": request.params.user_id });
  response.send({
    isSuccess: true,
    message: "data aa gaya",
    posts: posts,
  });
});

app.get("/get_user/:user_id", async (request, response) => {
  const user = await User.findById(request.params.user_id);
  response.send({
    isSuccess: true,
    message: "data aa gaya",
    user: user,
  });
});
