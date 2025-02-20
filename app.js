import express from "express";
import { config } from "dotenv";
import userRouter from "./routes/userRouter.js";
import adminRoutes from "./routes/adminRoutes.js";
import bodyParser from "body-parser";
import cors from "cors";
import mongodb from "./dbconfig.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { userChat } from "./controllers/chatController.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Connect to MongoDB
mongodb();

// ✅ CORS setup
app.use(cors());

// ✅ Raw body parser ONLY for Stripe webhook (must be before express.json())
// ✅ Place this BEFORE any other middleware
app.use('/api/v1/user/stripe-webhook', bodyParser.raw({ type: 'application/json' }));




// ✅ Apply body parsers AFTER webhook route to avoid signature issues
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS headers middleware
app.all('/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// ✅ Static files and routes
app.use(express.static(__dirname + '/ejs'));
app.use('/image', express.static('resource/static/assets/profile'));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ✅ Socket.io setup
const server = createServer(app);
const io = new Server(server);
const activeUsers = {};

io.on("connection", (socket) => {
  console.log('User connected:', socket.id);

  socket.on("chat-message", async (data) => {
    await userChat(data);
    io.emit("chat-message", data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete activeUsers[socket.id];
    io.emit('active-users', Object.keys(activeUsers));
  });

  socket.on('typing', () => {
    activeUsers[socket.id] = true;
    io.emit('active-users', Object.keys(activeUsers));
    socket.broadcast.emit('typing', socket.id);
  });

  socket.on('stop typing', () => {
    delete activeUsers[socket.id];
    io.emit('active-users', Object.keys(activeUsers));
    socket.broadcast.emit('stop typing', socket.id);
  });

  io.emit('active-users', Object.keys(activeUsers));
});
app.use("/api/v1/user", userRouter);
app.use("/api/v1/admin", adminRoutes)
// ✅ Start server
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
