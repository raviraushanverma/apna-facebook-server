import express, { request, response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connectDataBase from "./database.js";
import User from "./models/user.js";
import Post from "./models/post.js";

const findFieldNameFromObject = (obj, fieldName) => {
  return Object.keys(obj).find((key) => key.includes(fieldName));
};

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
    const user = await User.create(request.body);
    response.send({
      isSuccess: true,
      message: "apka account create ho gaya hai",
      user: user,
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
  const postWithOwner = await post.populate("owner");
  response.send({
    isSuccess: true,
    message: "apka post success ho gaya hai",
    post: postWithOwner,
  });
});

app.get("/posts", async (request, response) => {
  const posts = await Post.find()
    .populate("owner")
    .populate("comments.owner")
    .sort({ created: -1 });
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
  const postWithAllData = await (
    await post.populate("owner")
  ).populate("comments.owner");
  response.send({
    isSuccess: true,
    message: "data save ho gaya",
    post: postWithAllData,
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
    owner: request.params.user_id,
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
  const posts = await Post.find({
    owner: request.params.user_id,
  })
    .populate("owner")
    .populate("comments.owner")
    .sort({ created: -1 });
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

app.post("/profile_update/:user_id", async (request, response) => {
  const user = await User.updateOne(
    { _id: request.params.user_id },
    request.body
  );
  response.send({
    isSuccess: true,
    message: "proife save ho gaya hai",
  });
});

app.post("/friend_request/:user_id", async (request, response) => {
  const user = await User.findById(request.params.user_id);
  user.friendRequests.push(request.body.loggedInUserId);
  await user.save();
  response.send({
    isSuccess: true,
    message: "friendRequest save ho gaya hai",
  });
});

// SERVER SENT EVENT (SSE)
app.get("/notification/:logged_in_user_id", async (request, response) => {
  const { logged_in_user_id } = request.params;

  response.statusCode = 200;
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Content-Encoding", "none");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("X-Accel-Buffering", "no");
  response.setHeader("Connection", "keep-alive");
  response.write(`data: ${JSON.stringify({})}\n\n`);

  request.on("close", () => {});

  const pipeline = [
    {
      $match: {
        $or: [{ operationType: "insert" }, { operationType: "update" }],
      },
    },
  ];

  User.watch(pipeline).on("change", async (changes) => {
    const updatedFieldsObject = changes.updateDescription?.updatedFields;
    if (updatedFieldsObject && Object.keys(updatedFieldsObject).length) {
      const userId = changes.documentKey._id;
      if (userId == logged_in_user_id) {
        const friendRequestFieldKeyName = findFieldNameFromObject(
          updatedFieldsObject,
          "friendRequests"
        );
        const data = {
          action: "FRIEND_REQUEST",
          user: await User.findById(
            updatedFieldsObject[friendRequestFieldKeyName]
          ),
        };
        response.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }
  });

  Post.watch(pipeline).on("change", async (changes) => {
    const updatedFieldsObject = changes.updateDescription?.updatedFields;
    if (updatedFieldsObject && Object.keys(updatedFieldsObject).length) {
      const postId = changes.documentKey._id;
      const post = await Post.findById(postId);
      if (post.owner == logged_in_user_id) {
        const likeFieldName = findFieldNameFromObject(
          updatedFieldsObject,
          "likes"
        );
        if (likeFieldName) {
          const data = {
            action: "POST_LIKED",
            user: await User.findById(likeFieldName.split(".")[1]),
            post: post,
          };
          response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
        const commentFieldName = findFieldNameFromObject(
          updatedFieldsObject,
          "comments"
        );
        if (commentFieldName) {
          const data = {
            action: "POST_COMMENTED",
            user: await User.findById(
              updatedFieldsObject[commentFieldName][0].owner
            ),
            post: post,
          };
          response.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      }
    }
  });
});
