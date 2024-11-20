const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// CodeBlock Schema
const CodeBlockSchema = new mongoose.Schema({
  name: String,
  initialCode: String,
  solution: String,
});
const CodeBlock = mongoose.model("CodeBlock", CodeBlockSchema);

// Routes
app.get("/api/codeblocks", async (req, res) => {
  try {
    const codeblocks = await CodeBlock.find();
    res.json(codeblocks);
  } catch (err) {
    console.error("Error fetching code blocks:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/codeblocks/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid CodeBlock ID" });
  }

  try {
    const codeblock = await CodeBlock.findById(id);
    if (!codeblock) return res.status(404).json({ error: "CodeBlock not found" });
    res.json(codeblock);
  } catch (err) {
    console.error("Error fetching CodeBlock:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// WebSocket logic
const rooms = {};

io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on("joinRoom", ({ roomId }) => {
    if (!roomId) {
      console.error("Error: roomId is undefined in joinRoom event");
      socket.disconnect();
      return;
    }

    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        mentorId: null,
        students: new Map(),
        currentCode: "",
        messages: [],
      };
    }

    const room = rooms[roomId];

    if (!room.mentorId) {
      room.mentorId = socket.id;
      socket.emit("assignRole", "mentor");
      console.log(`Mentor assigned: ${socket.id} for room ${roomId}`);
    } else {
      const studentNumber = room.students.size + 1;
      const studentName = `Student ${studentNumber}`;
      room.students.set(socket.id, studentName);
      socket.emit("assignRole", studentName);
      console.log(`${studentName} joined: ${socket.id} for room ${roomId}`);
    }

    io.in(roomId).emit("studentCount", room.students.size);
    socket.emit("codeUpdate", room.currentCode);
    socket.emit("chatHistory", room.messages);

    console.log(`Room State for ${roomId}:`, {
      mentorId: room.mentorId,
      students: Array.from(room.students.values()),
      currentCode: room.currentCode,
      messages: room.messages,
    });
  });

  socket.on("sendMessage", ({ roomId, message, sender }) => {
    const room = rooms[roomId];
    if (room) {
      const chatMessage = { sender, message };
      room.messages.push(chatMessage);
      io.in(roomId).emit("receiveMessage", chatMessage);
      console.log(`Message sent in room ${roomId}:`, chatMessage);
    } else {
      console.error(`Room ${roomId} does not exist.`);
    }
  });

  socket.on("codeChange", ({ roomId, code }) => {
    if (rooms[roomId]) {
      rooms[roomId].currentCode = code;
      socket.to(roomId).emit("codeUpdate", code);
    }
  });

  socket.on("disconnect", () => {
    console.log(`A user disconnected: ${socket.id}`);

    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (room.mentorId === socket.id) {
        delete rooms[roomId];
        io.in(roomId).emit("mentorLeft");
        console.log(`Mentor left room ${roomId}`);
      } else if (room.students.has(socket.id)) {
        room.students.delete(socket.id);
        io.in(roomId).emit("studentCount", room.students.size);
        console.log(`A student left room ${roomId}`);

        if (!room.mentorId && room.students.size === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} is now empty and deleted.`);
        }
      }
    }
  });

  socket.on("leaveRoom", ({ roomId }) => {
    console.log(`User ${socket.id} leaving room ${roomId}`);
    socket.leave(roomId);

    if (rooms[roomId]) {
      const room = rooms[roomId];

      if (room.mentorId === socket.id) {
        delete rooms[roomId];
        io.in(roomId).emit("mentorLeft");
        console.log(`Mentor left room ${roomId}`);
      } else if (room.students.has(socket.id)) {
        const studentLabel = room.students.get(socket.id);
        room.students.delete(socket.id);
        io.in(roomId).emit("studentCount", room.students.size);
        console.log(`${studentLabel} left room ${roomId}`);

        if (!room.mentorId && room.students.size === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} is now empty and deleted.`);
        }
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
