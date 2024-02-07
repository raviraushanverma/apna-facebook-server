const socketToUserIdMapping = new Map();

export const webSocketCallBack = (socket) => {
  socket.emit("all-connected-users", [...socketToUserIdMapping.values()]);

  socket.on("user-connected", (userId) => {
    socketToUserIdMapping.set(`${socket.id}`, userId);
    socket.broadcast.emit("other-user-connected", userId);
  });

  socket.on("disconnect", function () {
    socket.broadcast.emit(
      "other-user-disconnected",
      socketToUserIdMapping.get(`${socket.id}`)
    );
    socketToUserIdMapping.delete(`${socket.id}`);
  });
};
