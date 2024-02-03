import Notification from "../models/notification.js";
import User from "../models/user.js";

export const notificationWatcher = ({ loggedInUserId, response }) => {
  const notificationStream = Notification.watch([]);
  notificationStream.on("change", async (change) => {
    if (change.operationType === "insert") {
      if (change.fullDocument.owner == loggedInUserId) {
        const newNotification = await Notification.findById(
          change.fullDocument._id
        )
          .populate("owner", "-email -password")
          .populate("user", "-email -password")
          .populate({
            path: "post",
            populate: { path: "comments.owner", select: "-email -password" },
          });
        response.write(
          `data: ${JSON.stringify({
            notificationStream: {
              operationType: change.operationType,
              newNotification,
            },
          })}\n\n`
        );
      }
    } else if (change.operationType === "delete") {
      response.write(
        `data: ${JSON.stringify({
          notificationStream: {
            operationType: change.operationType,
            deletedNotificationId: change.documentKey._id,
            owner: await User.findById(loggedInUserId, {
              email: 0,
              password: 0,
            }),
          },
        })}\n\n`
      );
    }
  });

  return notificationStream;
};
