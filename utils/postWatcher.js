import Post from "../models/post.js";

export const postWatcher = ({ loggedInUserId, response }) => {
  const postStream = Post.watch([]);
  postStream.on("change", async (change) => {
    if (change.operationType === "insert") {
      if (change.fullDocument.owner != loggedInUserId) {
        const newPost = await Post.findById(change.fullDocument._id)
          .populate("owner")
          .populate("comments.owner");
        response.write(
          `data: ${JSON.stringify({
            postStream: {
              operationType: change.operationType,
              newPost,
            },
          })}\n\n`
        );
      }
    } else if (change.operationType === "delete") {
      response.write(
        `data: ${JSON.stringify({
          postStream: {
            operationType: change.operationType,
            deletedPostId: change.documentKey._id,
          },
        })}\n\n`
      );
    }
  });

  return postStream;
};
