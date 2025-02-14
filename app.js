import express from "express";
import { config } from "dotenv";
import userRouter from "./routes/userRouter.js";
import adminRoutes from "./routes/adminRoutes.js"
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

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());


mongodb();

app.all('/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Request-Headers', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Headers, x-auth-token, x-l10n-locale, Cache-Control, timeout, form-data')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  next()
});

const activeUsers = {};

const server = createServer(app)


// const server = app.listen(1337, () => {
//   console.log("Server running at port!");
// });
const io = new Server(server);

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

const port = process.env.PORT;
app.use(express.static(__dirname + 'ejs'))
app.use('/image', express.static('resource/static/assets/profile'))
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/api/v1/user", userRouter);
app.use("/api/v1/admin", adminRoutes)

server.listen(port,() => {
  console.log(`Example app listening at http://localhost:${port}`);
});

