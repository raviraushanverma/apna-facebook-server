import User from "./models/user.js";
import Notification from "./models/notification.js";

const socketToUserIdMapping = new Map();
const userToSocketMapping = new Map();

export const webSocketCallBack = (socket) => {
  socket.emit("all-connected-users", [...socketToUserIdMapping.values()]);

  socket.on("user-connected", (userId) => {
    console.log("user connected with ID ==> ", userId);
    socket.emit("all-connected-users", [...socketToUserIdMapping.values()]);
    socketToUserIdMapping.set(`${socket.id}`, userId);
    userToSocketMapping.set(`${userId}`, socket);
    socket.broadcast.emit("other-user-connected", userId);
  });

  socket.on("disconnect", async () => {
    const userId = socketToUserIdMapping.get(`${socket.id}`);
    const user = await User.findById(userId);
    if (userId && user) {
      console.log("user disconnected with ID ==> ", userId);
      const lastLoggedInTime = Date.now();
      socket.broadcast.emit("other-user-disconnected", {
        userId,
        lastLoggedInTime,
      });
      socketToUserIdMapping.delete(`${socket.id}`);
      userToSocketMapping.delete(`${userId}`);
      user.lastLoggedInTime = lastLoggedInTime;
      await user.save();
    }
  });

  socket.on("send-typing", (data) => {
    const to = userToSocketMapping.get(data.to);
    if (to) {
      to.emit("receive-typing", data);
    }
  });

  socket.on("send-message", async (data) => {
    const to = userToSocketMapping.get(data.to);
    // saving chat in data-base
    const toUser = await User.findById(data.to);
    const fromUser = await User.findById(data.from);
    if (toUser && fromUser) {
      const tempArray1 = toUser.chats.get(`${data.from}`) || [];
      tempArray1.push(data);
      toUser.chats.set(`${data.from}`, JSON.parse(JSON.stringify(tempArray1)));
      await toUser.save();

      const tempArray2 = fromUser.chats.get(`${data.to}`) || [];
      tempArray2.push(data);
      fromUser.chats.set(`${data.to}`, JSON.parse(JSON.stringify(tempArray2)));
      await fromUser.save();
    }

    setTimeout(async () => {
      if (to) {
        to.emit("receive-message", data);
      } else {
        await Notification.create({
          owner: data.to,
          created: data.time,
          action: "CHAT_MESSAGE",
          user: data.from,
          message: data.message,
        });
      }
    });
  });
};
