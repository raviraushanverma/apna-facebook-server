import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import connectDataBase from "./database.js";
import User from "./models/user.js";
import Post from "./models/post.js";
import Notification from "./models/notification.js";
import { notificationWatcher } from "./utils/notificationWatcher.js";
import { postWatcher } from "./utils/postWatcher.js";
import { Types } from "mongoose";
import { webSocketCallBack } from "./websocket.js";

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://apna-facebook.vercel.app"],
    methods: ["GET", "POST"],
  },
});

connectDataBase();

const port = 5001;

app.use(cors());

app.use(bodyParser.json());

httpServer.listen(port, () => {
  console.log(`===========================================`);
  console.log(`Apna Facebook app listening on port ${port}`);
  console.log(`===========================================`);
});

io.on("connection", (socket) => {
  webSocketCallBack({ socket, io });
});

app.get("/", async (request, response) => {
  response.send("Wow, Our API is working!!!!!");
});

// SERVER SENT EVENT (SSE)
app.get(
  "/subscribe_for_live_updates/:loggedInUserId?",
  async (request, response) => {
    try {
      const loggedInUserId = request.params.loggedInUserId;
      if (!loggedInUserId) {
        response.send({
          isSuccess: false,
          message: "you are not authorised",
        });
        return null;
      }

      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Content-Encoding": "none",
        "Cache-Control": "no-cache, no-transform",
        "Access-Control-Allow-Credentials": true,
        Connection: "keep-alive",
      });

      response.write(`data: ${JSON.stringify(null)}\n\n`);

      const notificationStream = notificationWatcher({
        loggedInUserId,
        response,
      });

      const postStream = postWatcher({
        loggedInUserId,
        response,
      });

      request.on("close", () => {
        notificationStream.close();
        postStream.close();
      });
    } catch (error) {
      response.send({
        isSuccess: false,
        message: `Error: ${error}`,
      });
    }
  }
);

app.post("/notfication_read/:user_id", async (request, response) => {
  try {
    for (const notify of request.body.unreadNotificationsIdArray) {
      await Notification.updateOne({ _id: notify._id }, { isRead: true });
    }
    response.send({
      isSuccess: true,
      message: "proife save ho gaya hai",
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get("/get_notifications/:user_id/:limit?", async (request, response) => {
  try {
    let notifications;
    if (request.params.limit) {
      notifications = await Notification.find({
        owner: request.params.user_id,
      })
        .populate("user", "-email -password")
        .populate("post")
        .limit(request.params.limit)
        .sort({ created: -1 });
    } else {
      notifications = await Notification.find({
        owner: request.params.user_id,
      })
        .populate("user", "-email -password")
        .populate("friends.$*.user", "-email -password")
        .populate("post")
        .sort({ created: -1 });
    }
    response.send({
      isSuccess: true,
      message: "notifications aa gaya hai",
      notifications,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/sign_up", async (request, response) => {
  try {
    const user = await User.findOne({ email: request.body.email });
    if (user === null) {
      const user = await User.create(request.body);
      response.send({
        isSuccess: true,
        message: "apka account create ho gaya hai",
        user,
      });
    } else {
      response.send({
        isSuccess: true,
        message: "apka ye email se already account created hai ",
      });
    }
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/login", async (request, response) => {
  try {
    const user = await User.findOne({
      email: request.body.email,
      password: request.body.password,
    }).populate("friends.$*.user", "name profilePicURL lastLoggedInTime");

    if (user !== null) {
      response.send({
        isSuccess: true,
        messsage: "app login ho chuke hai",
        user: user,
      });
    } else {
      response.send({
        isSuccess: true,
        message: "incorrect email or password",
      });
    }
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/get-me", async (request, response) => {
  try {
    const me = await User.findOne({
      _id: request.body.loggedInUserId,
    }).populate("friends.$*.user", "name profilePicURL lastLoggedInTime");
    response.send({
      isSuccess: true,
      messsage: "its you",
      me: me,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/post", async (request, response) => {
  try {
    const post = await Post.create(request.body);
    const postWithOwner = await post.populate("owner");
    response.send({
      isSuccess: true,
      message: "apka post success ho gaya hai",
      post: postWithOwner,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get("/posts/:loggedInUserId", async (request, response) => {
  try {
    const posts = await Post.find()
      .populate("owner")
      .populate("comments.owner")
      .sort({ created: -1 });
    const filteredPosts = posts.filter((post) => {
      if (
        (post.owner.friends.has(request.params.loggedInUserId) &&
          post.owner.friends.get(request.params.loggedInUserId).state ===
            "FRIEND_REQUEST_CONFIRM") ||
        post.owner._id == request.params.loggedInUserId
      ) {
        return post;
      }
    });
    response.send({
      isSuccess: true,
      message: "data aa gaya",
      posts: filteredPosts,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/comment", async (request, response) => {
  try {
    const post = await Post.findById(request.body.postId);
    const commentOwner = await User.findById(request.body.comments.owner, {
      email: 0,
      password: 0,
    });
    if (!post || !commentOwner) {
      throw new Error("Post or User not found!");
    }

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
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.delete(
  "/comment_delete/:post_id/:comment_id",
  async (request, response) => {
    try {
      const post = await Post.findById(request.params.post_id)
        .populate("owner")
        .populate("comments.owner");
      const commentIndex = post.comments.findIndex((comment) => {
        return request.params.comment_id == comment._id;
      });
      if (commentIndex === -1) {
        throw new Error("Comment not found!");
      }

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
    } catch (error) {
      response.send({
        isSuccess: false,
        message: `Error: ${error}`,
      });
    }
  }
);

app.delete("/post_delete/:post_id/:user_id", async (request, response) => {
  try {
    const post = await Post.deleteOne({
      _id: request.params.post_id,
      owner: request.params.user_id,
    });

    /*
      we are not deleting all notifications here
      because of time complexity
      This can have many likes and comments,
      we can not delete all the notification
      which will cause higher time complexity
    */

    response.send({
      isSuccess: true,
      message: "post delete ho gaya hai",
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post(
  "/post_like/:post_id/:user_id/:user_name",
  async (request, response) => {
    try {
      const post = await Post.findById(request.params.post_id);
      const user = await User.findById(request.params.user_id, {
        email: 0,
        password: 0,
      });
      if (!post || !user) {
        throw new Error("Post or User not found!");
      }

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
    } catch (error) {
      response.send({
        isSuccess: false,
        message: `Error: ${error}`,
      });
    }
  }
);

app.post("/comment_edit/:post_id/:comment_id", async (request, response) => {
  try {
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
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get("/profile_post/:user_id", async (request, response) => {
  try {
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
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get("/get_user/:user_id", async (request, response) => {
  try {
    const user = await User.findById(request.params.user_id, {
      email: 0,
      password: 0,
    });
    response.send({
      isSuccess: true,
      message: "data aa gaya",
      user: user,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/profile_update/:user_id", async (request, response) => {
  try {
    await User.updateOne({ _id: request.params.user_id }, request.body);
    response.send({
      isSuccess: true,
      message: "proife save ho gaya hai",
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/friend_request_send/:user_id", async (request, response) => {
  try {
    const loggedInUser = await User.findById(request.body.loggedInUserId, {
      email: 0,
      password: 0,
    }).populate("friends.$*.user", "-email -password");
    const user = await User.findById(request.params.user_id, {
      email: 0,
      password: 0,
    });
    if (!user || !loggedInUser) {
      throw new Error("User not found!");
    }

    const created = Date.now();
    user.friends.set(request.body.loggedInUserId, {
      state: "FRIEND_REQUEST_CAME",
      created,
      user: request.body.loggedInUserId,
    });

    loggedInUser.friends.set(request.params.user_id, {
      state: "FRIEND_REQUEST_SENT",
      created,
      user: request.params.user_id,
    });

    await user.save();
    await loggedInUser.save();

    const newNotification = await Notification.create({
      owner: request.params.user_id,
      created,
      action: "FRIEND_REQUEST_CAME",
      user: request.body.loggedInUserId,
    });

    user.friends.set(request.body.loggedInUserId, {
      ...JSON.parse(
        JSON.stringify(user.friends.get(request.body.loggedInUserId))
      ),
      notificationId: newNotification._id,
    });

    loggedInUser.friends.set(request.params.user_id, {
      ...JSON.parse(
        JSON.stringify(loggedInUser.friends.get(request.params.user_id))
      ),
      notificationId: newNotification._id,
    });

    await user.save();
    await loggedInUser.save();

    response.send({
      isSuccess: true,
      message: "friendRequest save ho gaya hai",
      loggedInUser,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

// this is for both cancel_request and reject_request
app.post("/friend_request_cancel/:user_id", async (request, response) => {
  try {
    const user = await User.findById(request.params.user_id, {
      email: 0,
      password: 0,
    });
    const loggedInUser = await User.findById(request.body.loggedInUserId, {
      email: 0,
      password: 0,
    }).populate("friends.$*.user", "-email -password");
    if (!user || !loggedInUser) {
      throw new Error("User not found!");
    }

    const notificationId = user.friends.get(
      request.body.loggedInUserId
    ).notificationId;

    user.friends.delete(request.body.loggedInUserId);
    loggedInUser.friends.delete(request.params.user_id);

    await user.save();
    await loggedInUser.save();

    // Deleting Notification
    if (notificationId) {
      await Notification.deleteOne({
        _id: notificationId,
      });
    }

    response.send({
      isSuccess: true,
      message: "friendRequest delete ho gaya hai",
      loggedInUser,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.post("/friend_request_accept/:user_id", async (request, response) => {
  try {
    const loggedInUser = await User.findById(request.body.loggedInUserId, {
      email: 0,
      password: 0,
    }).populate("friends.$*.user", "-email -password");
    const user = await User.findById(request.params.user_id, {
      email: 0,
      password: 0,
    });
    if (!user || !loggedInUser) {
      throw new Error("User not found!");
    }
    const created = Date.now();

    // Deleting Notification
    const fbRequestObj = loggedInUser.friends.get(request.params.user_id);
    if (fbRequestObj) {
      await Notification.deleteOne({
        _id: fbRequestObj.notificationId,
      });
    }

    user.friends.set(request.body.loggedInUserId, {
      ...JSON.parse(
        JSON.stringify(user.friends.get(request.body.loggedInUserId))
      ),
      state: "FRIEND_REQUEST_CONFIRM",
    });
    loggedInUser.friends.set(request.params.user_id, {
      ...JSON.parse(
        JSON.stringify(loggedInUser.friends.get(request.params.user_id))
      ),
      state: "FRIEND_REQUEST_CONFIRM",
    });

    await (
      await loggedInUser.save()
    ).populate("friends.$*.user", "-email -password");
    await user.save();

    await Notification.create({
      owner: request.params.user_id,
      created,
      action: "FRIEND_REQUEST_ACCEPTED",
      user: request.body.loggedInUserId,
    });

    response.send({
      isSuccess: true,
      message: "friend request accepted",
      loggedInUser,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.delete("/unfriend/:user_id", async (request, response) => {
  try {
    const loggedInUser = await User.findById(request.body.loggedInUserId, {
      email: 0,
      password: 0,
    }).populate("friends.$*.user", "-email -password");
    const user = await User.findById(request.params.user_id, {
      email: 0,
      password: 0,
    });
    if (!user || !loggedInUser) {
      throw new Error("User not found!");
    }

    user.friends.delete(request.body.loggedInUserId);
    loggedInUser.friends.delete(request.params.user_id);

    await loggedInUser.save();
    await user.save();

    await Notification.create({
      owner: request.params.user_id,
      created: Date.now(),
      action: "UNFRIEND",
      user: request.body.loggedInUserId,
    });

    response.send({
      isSuccess: true,
      message: "unfriend",
      loggedInUser,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get(
  "/new_friend_suggestion_list/:loggedInUserId",
  async (request, response) => {
    try {
      const users = await User.find(
        {},
        {
          email: 0,
          password: 0,
        }
      );
      const newFriendSuggetion = users.filter((user) => {
        return (
          user._id != request.params.loggedInUserId &&
          (user.friends.has(request.params.loggedInUserId) === false ||
            (user.friends.has(request.params.loggedInUserId) === true &&
              user.friends.get(request.params.loggedInUserId).state ===
                "FRIEND_REQUEST_CAME"))
        );
      });

      response.send({
        isSuccess: true,
        message: "data aa gaya",
        users: newFriendSuggetion.reverse(),
      });
    } catch (error) {
      response.send({
        isSuccess: false,
        message: `Error: ${error}`,
      });
    }
  }
);

app.get("/get_friend_list/:loggedInUserId", async (request, response) => {
  try {
    const loggedInUser = await User.findOne({
      _id: new Types.ObjectId(request.params.loggedInUserId),
    }).populate("friends.$*.user", "name profilePicURL lastLoggedInTime");

    const friends = [...loggedInUser.friends.values()]
      .filter((obj) => {
        return obj.state === "FRIEND_REQUEST_CONFIRM";
      })
      .map((obj) => obj.user);
    response.send({
      isSuccess: true,
      message: "data aa gaya",
      users: friends,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get("/get_post_detail/:postId", async (request, response) => {
  try {
    const post = await Post.findById(request.params.postId)
      .populate("owner", "-email -password")
      .populate("comments.owner", "-email -password");
    response.send({
      isSuccess: true,
      message: "post aa gaya",
      post,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get("/autocomplete/:searchUserName?", async (request, response) => {
  try {
    let users = [];
    if (request.params.searchUserName) {
      users = await User.find(
        { name: { $regex: request.params.searchUserName, $options: "i" } },
        { name: 1, profilePicURL: 1 }
      ).sort({
        updated_at: -1,
      });
    }
    response.send({
      isSuccess: true,
      message: "typeahead data aa gaya hain",
      users,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});

app.get("/get-chat/:loggedInUserId/:friendId", async (request, response) => {
  try {
    const loggedInUser = await User.findById(request.params.loggedInUserId);
    if (!loggedInUser) {
      response.send({
        isSuccess: false,
        message: "you are not authorised",
      });
      return null;
    }
    const chats = loggedInUser.chats.get(`${request.params.friendId}`);
    response.send({
      isSuccess: true,
      message: "typeahead data aa gaya hain",
      chats,
    });
  } catch (error) {
    response.send({
      isSuccess: false,
      message: `Error: ${error}`,
    });
  }
});
