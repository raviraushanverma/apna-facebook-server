import express, { request, response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connectDataBase from "./database.js";
import User from "./models/user.js";
import Post from "./models/post.js";
import Notification from "./models/notification.js";
import { notificationWatcher } from "./utils/notificationWatcher.js";
import { postWatcher } from "./utils/postWatcher.js";

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
  const post = await Post.findById(request.body.postId);
  const created = Date.now();
  const commentObj = {
    ...request.body.comments,
    created,
  };

  post.comments.unshift(commentObj);
  await post.save();

  if (post.owner != request.body.comments.owner) {
    const newNotification = await Notification.create({
      owner: post.owner,
      created,
      action: "POST_COMMENTED",
      user: request.body.comments.owner,
      post: request.body.postId,
      comment: post.comments[0]._id,
    });
    post.comments[0].notificationId = newNotification._id;
  }

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
    const post = await Post.findById(request.params.post_id)
      .populate("owner")
      .populate("comments.owner");
    const commentIndex = post.comments.findIndex((comment) => {
      return request.params.comment_id == comment._id;
    });

    // Deleting Notification
    await Notification.deleteOne({
      _id: post.comments[commentIndex].notificationId,
    });

    post.comments.splice(commentIndex, 1);
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
    const created = Date.now();
    const isLiked = post.likes.has(request.params.user_id);
    if (isLiked === false) {
      const likeObject = {
        created,
        userName: request.params.user_name,
      };
      if (post.owner != request.params.user_id) {
        const newNotification = await Notification.create({
          owner: post.owner,
          created,
          action: "POST_LIKED",
          user: request.params.user_id,
          post: request.params.post_id,
        });
        likeObject.notificationId = newNotification._id;
      }
      post.likes.set(request.params.user_id, likeObject);
    } else {
      await Notification.deleteOne({
        _id: post.likes.get(request.params.user_id).notificationId,
      });
      post.likes.delete(request.params.user_id);
    }
    await post.save();
    response.send({
      isSuccess: true,
      message: "post like ho gaya hai",
    });
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
  await User.updateOne({ _id: request.params.user_id }, request.body);
  response.send({
    isSuccess: true,
    message: "proife save ho gaya hai",
  });
});

app.post("/friend_request_send/:user_id", async (request, response) => {
  const user = await User.findById(request.params.user_id);
  const created = Date.now();

  const newNotification = await Notification.create({
    owner: request.params.user_id,
    created,
    action: "FRIEND_REQUEST_SENT",
    user: request.body.loggedInUserId,
  });

  user.friendRequests.set(request.body.loggedInUserId, {
    created,
    friend: request.body.loggedInUserId,
    notificationId: newNotification._id,
  });

  await user.save();
  response.send({
    isSuccess: true,
    message: "friendRequest save ho gaya hai",
    user: user,
  });
});

app.post("/friend_request_cancel/:user_id", async (request, response) => {
  const user = await User.findById(request.params.user_id);

  // Deleting Notification
  await Notification.deleteOne({
    _id: user.friendRequests.get(request.body.loggedInUserId).notificationId,
  });

  user.friendRequests.delete(request.body.loggedInUserId);
  await user.save();
  response.send({
    isSuccess: true,
    message: "friendRequest delete ho gaya hai",
    user,
  });
});

app.get("/get_notifications/:user_id/:limit?", async (request, response) => {
  let notifications;
  if (request.params.limit) {
    notifications = await Notification.find({
      owner: request.params.user_id,
    })
      .populate("user")
      .populate("post")
      .limit(request.params.limit)
      .sort({ created: -1 });
  } else {
    notifications = await Notification.find({
      owner: request.params.user_id,
    })
      .populate("user")
      .populate("post")
      .sort({ created: -1 });
  }
  response.send({
    isSuccess: true,
    message: "notifications aa gaya hai",
    notifications,
  });
});

// SERVER SENT EVENT (SSE)
app.get(
  "/subscribe_for_events/:logged_in_user_id",
  async (request, response) => {
    const { logged_in_user_id } = request.params;

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Content-Encoding": "none",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
      Connection: "keep-alive",
    });

    response.write(`data: ${JSON.stringify(null)}\n\n`);

    const notificationStream = notificationWatcher({
      loggedInUserId: logged_in_user_id,
      response,
    });

    const postStream = postWatcher({
      loggedInUserId: logged_in_user_id,
      response,
    });

    request.on("close", () => {
      notificationStream.close();
      postStream.close();
    });
  }
);

app.post("/notfication_read/:user_id", async (request, response) => {
  for (const notify of request.body.unreadNotificationsIdArray) {
    await Notification.updateOne({ _id: notify._id }, { isRead: true });
  }
  response.send({
    isSuccess: true,
    message: "proife save ho gaya hai",
  });
});

app.post("/friend_request_accept/:user_id", async (request, response) => {
  response.send({
    isSuccess: true,
    message: "proife save ho gaya hai",
  });
});
