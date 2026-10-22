require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const gameRoutes = require('./routes/game');
const eretzIrRoutes = require('./routes/eretzIr');
const { createGame: createEretzIr } = require('./eretz-ir/game');

const PORT = process.env.PORT || 4403;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || LOCAL_ORIGIN.test(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/game', gameRoutes);
app.use('/api/eretz-ir', eretzIrRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });
createEretzIr(io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
