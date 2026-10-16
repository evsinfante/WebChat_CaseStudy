/* server.js */

import express from "express";
import http from "http";
import { Server } from "socket.io";
import * as data from "./data.js";
import * as colors from "./colors.js";

const PORT = process.env.PORT || 9000;

const app = express();
app.use(express.static("public"));
app.use(express.json());

app.use((req, _res, next) => {
    const timestamp = new Date(Date.now());
    console.log(`[${timestamp.toDateString()} ${timestamp.toTimeString()}] / ${timestamp.toISOString()}`);
    console.log(req.method, req.hostname, req.path);
    console.log("headers:", req.headers);
    console.log("body:", req.body);
    next();
});

const httpServer = http.createServer(app);
const io = new Server(httpServer);

const emitUsersInRoom = (roomName) => {
    const room = io.sockets.adapter.rooms.get(roomName);

    if (!room) {
        io.to(roomName).emit("users update", []);
        return;
    }

    const users = [...room]
        .map((socketId) => io.sockets.sockets.get(socketId))
        .filter((socket) => socket?.data?.userName)
        .map((socket) => ({
            userName: socket.data.userName,
            color: socket.data.color
        }));

    io.to(roomName).emit("users update", users);
};

io.on("connect", (socket) => {
    console.log("New connection", socket.id);

    socket.on("join", (joinInfo) => {
        console.log(joinInfo);
        const { roomName, userName } = joinInfo;

        if (data.isUserNameAvailable(userName)) {
            socket.data = joinInfo;
            socket.data.color = colors.getRandomColor();

            data.registerUser(userName);
            socket.join(roomName);

            socket.on("typing", (typingInfo) => {
                const { roomName, userName, isTyping } = typingInfo;
                data.updateTypingStatus(roomName, userName, isTyping);
                io.to(roomName).emit("typing", data.getTypingUsers(roomName));
            });

            socket.on("message", (text) => {
                const { roomName, userName, color } = socket.data;

                const messageInfo = {
                    sender: userName,
                    text,
                    color
                };

                data.addMessage(roomName, messageInfo);

                data.updateTypingStatus(roomName, userName, false);
                io.to(roomName).emit("typing", data.getTypingUsers(roomName));

                io.to(roomName).emit("chat update", data.roomLog(roomName));
            });

            socket.on("edit", (editInfo) => {
                const { roomName, userName, editedText } = editInfo;

                const didEdit = data.editLastMessage(roomName, userName, editedText);

                if (didEdit) {
                    data.updateTypingStatus(roomName, userName, false);
                    io.to(roomName).emit("typing", data.getTypingUsers(roomName));
                    io.to(roomName).emit("chat update", data.roomLog(roomName));
                }
            });

            socket.on("delete", (deleteInfo) => {
            const { roomName, userName } = deleteInfo;

            const didDelete = data.deleteLastMessage(roomName, userName);

            if (didDelete) {
                data.updateTypingStatus(roomName, userName, false);
                io.to(roomName).emit("typing", data.getTypingUsers(roomName));
                io.to(roomName).emit("chat update", data.roomLog(roomName));
            }
        });

            socket.on("disconnect", () => {
                const { roomName, userName, color } = socket.data || {};

                if (roomName && userName) {
                    data.addMessage(roomName, {
                        sender: "",
                        text: `${userName} has left the room`
                    });

                    io.to(roomName).emit("chat update", data.roomLog(roomName));

                    data.unregisterUser(userName);

                    data.updateTypingStatus(roomName, userName, false);
                    io.to(roomName).emit("typing", data.getTypingUsers(roomName));
                }

                if (color) {
                    colors.releaseColor(color);
                }

                if (roomName) {
                    emitUsersInRoom(roomName);
                }
            });

            io.to(socket.id).emit("joined", roomName);

            io.to(roomName).emit("room update", `${userName} has joined the room`);

            data.addMessage(roomName, {
                sender: "",
                text: `${userName} has joined the room`
            });

            io.to(roomName).emit("chat update", data.roomLog(roomName));
            emitUsersInRoom(roomName);
            socket.emit("typing", data.getTypingUsers(roomName));
        } else {
            joinInfo.error = `The name ${userName} is already taken`;
        }

        socket.emit("join-response", joinInfo);
    });
});

httpServer.listen(PORT, () => console.log(`Listening on port ${PORT}`));