import { Types } from "mongoose";
import Notification from "../models/notification.js";

const getFilter = (loggedInUserId) => {
  return [
    {
      $match: {
        $and: [
          { "fullDocument.owner": new Types.ObjectId(loggedInUserId) },
          { $or: [{ operationType: "insert" }, { operationType: "delete" }] },
        ],
      },
    },
  ];
};

export const notificationWatcher = ({ loggedInUserId, response }) => {
  const notificationStream = Notification.watch(getFilter(loggedInUserId));
  notificationStream.on("change", async (change) => {
    const newNotification = await Notification.findById(change.fullDocument._id)
      .populate("user")
      .populate("post");
    response.write(`data: ${JSON.stringify({ newNotification })}\n\n`);
  });

  return notificationStream;
};
