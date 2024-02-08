const socketToUserIdMapping = new Map();

export const webSocketCallBack = (socket) => {
  socket.emit("all-connected-users", [...socketToUserIdMapping.values()]);

  socket.on("user-connected", (userId) => {
    console.log("user connected with ID ==> ", userId);
    socketToUserIdMapping.set(`${socket.id}`, userId);
    socket.broadcast.emit("other-user-connected", userId);
  });

  socket.on("disconnect", function () {
    const userId = socketToUserIdMapping.get(`${socket.id}`);
    if (userId) {
      console.log("user disconnected with ID ==> ", userId);
      socket.broadcast.emit("other-user-disconnected", userId);
      socketToUserIdMapping.delete(`${socket.id}`);
    }
  });
};
