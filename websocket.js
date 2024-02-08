import User from "./models/user.js";

const socketToUserIdMapping = new Map();
const userToSocketMapping = new Map();

export const webSocketCallBack = (socket) => {
  socket.emit("all-connected-users", [...socketToUserIdMapping.values()]);

  socket.on("user-connected", (userId) => {
    console.log("user connected with ID ==> ", userId);
    socketToUserIdMapping.set(`${socket.id}`, userId);
    userToSocketMapping.set(`${userId}`, socket);
    socket.broadcast.emit("other-user-connected", userId);
  });

  socket.on("disconnect", function () {
    const userId = socketToUserIdMapping.get(`${socket.id}`);
    if (userId) {
      console.log("user disconnected with ID ==> ", userId);
      socket.broadcast.emit("other-user-disconnected", userId);
      socketToUserIdMapping.delete(`${socket.id}`);
      userToSocketMapping.delete(`${userId}`);
    }
  });

  socket.on("send-message", async (data) => {
    const to = userToSocketMapping.get(data.to);
    if (to) {
      to.emit("receive-message", data);
    }
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
  });
};
