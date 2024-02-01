// import { Types } from "mongoose";
import Post from "../models/post.js";

const getFilter = (loggedInUserId) => {
  return [
    {
      $match: {
        $and: [
          // { "fullDocument.owner": { $ne: new Types.ObjectId(loggedInUserId) } },
          { $or: [{ operationType: "insert" }] },
        ],
      },
    },
  ];
};

export const postWatcher = ({ loggedInUserId, response }) => {
  const postStream = Post.watch(getFilter(loggedInUserId));
  postStream.on("change", async (change) => {
    if (change.fullDocument.owner != loggedInUserId) {
      const newPost = await Post.findById(change.fullDocument._id)
        .populate("owner")
        .populate("comments.owner");
      response.write(`data: ${JSON.stringify({ newPost })}\n\n`);
    }
  });

  return postStream;
};
