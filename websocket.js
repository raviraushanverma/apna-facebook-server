const socketToUserIdMapping = new Map();

export const webSocketCallBack = (socket) => {
  socket.emit("all-connected-users", [...socketToUserIdMapping.values()]);

  socket.on("user-connected", (userId) => {
    console.log("user connected with ID ", userId);
    socketToUserIdMapping.set(`${socket.id}`, userId);
    socket.broadcast.emit("other-user-connected", userId);
  });

  socket.on("disconnect", function () {
    console.log("user disconnected with ID ", `${socket.id}`);
    socket.broadcast.emit(
      "other-user-disconnected",
      socketToUserIdMapping.get(`${socket.id}`)
    );
    socketToUserIdMapping.delete(`${socket.id}`);
  });
};
