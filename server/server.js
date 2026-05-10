require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Route imports
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const teamRoutes = require('./routes/teams');
const auctionRoutes = require('./routes/auction');
const importRoutes = require('./routes/import');
const resultsRoutes = require('./routes/results');
const autobidRoutes = require('./routes/autobid');
const suggestionsRoutes = require('./routes/suggestions');
const poolsRoutes = require('./routes/pools');
const initAuctionSocket = require('./socket/auctionSocket');

const app = express();
const server = http.createServer(app);

const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/import', importRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/autobid', autobidRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/pools', poolsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.io auction handler
initAuctionSocket(io);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    
    // Auto-create default admin if none exists
    try {
      const User = require('./models/User');
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const adminUser = new User({
          name: 'Auction Admin',
          email: 'admin@iplauction.com',
          password: 'adminpassword',
          role: 'admin'
        });
        await adminUser.save();
        console.log('👑 Default Admin created -> Email: admin@iplauction.com | Password: adminpassword');
      }
    } catch (err) {
      console.error('Failed to create default admin:', err.message);
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready for connections`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Starting server without database...');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (no database)`);
    });
  });
