import { Types } from "mongoose";
import User from "../models/user.js";

const options = { fullDocument: "updateLookup" };
const getFilter = (loggedInUserId) => {
  return [
    {
      $match: {
        $and: [
          // {
          //   "updateDescription.updatedFields.notifications.$*": {
          //     $exists: true,
          //   },
          // },
          { "fullDocument._id": new Types.ObjectId(loggedInUserId) },
        ],
      },
    },
  ];
};

export const notificationWatcher = ({ loggedInUserId, response }) => {
  const notificationStream = User.watch(getFilter(loggedInUserId), options);

  notificationStream.on("change", async (change) => {
    const { updatedFields } = change.updateDescription;
    if (updatedFields) {
      const isNotificationChanged = Object.keys(updatedFields).find((key) =>
        key.includes("notifications")
      );
      if (isNotificationChanged) {
        const userObject = await User.findById(change.fullDocument._id)
          .populate("notifications.$*.user")
          .populate("notifications.$*.post");
        response.write(`data: ${JSON.stringify(userObject.notifications)}\n\n`);
      }
    }
  });

  return notificationStream;
};
