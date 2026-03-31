require('dotenv').config();
// Force Node.js DNS to use Google's resolver (fixes ECONNREFUSED on some Windows setups)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const socketService = require('./services/socket');

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const funnelRoutes = require('./routes/funnel');
const trackRoutes = require('./routes/track');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean);
// Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

socketService.init(io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api', authRoutes);
app.use('/api', leadRoutes);
app.use('/api/funnel', funnelRoutes);
app.use('/track', trackRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Start HTTP server immediately so frontend can connect
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Connect to MongoDB with retry
async function connectDB(retries = 5, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB connected');

      const { runScheduler } = require('./services/funnel');
      setInterval(() => {
        runScheduler().catch((err) => console.error('Scheduler error:', err.message));
      }, 60 * 60 * 1000);
      console.log('Funnel scheduler started (runs every hour)');
      return;
    } catch (err) {
      console.error(`MongoDB attempt ${i}/${retries} failed: ${err.message}`);
      if (i < retries) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.error('All MongoDB connection attempts failed. Server running without DB.');
      }
    }
  }
}

connectDB();
