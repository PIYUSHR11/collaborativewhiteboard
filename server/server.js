//robust room management
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
    method:['GET','POST']
  },
  // Allow both websocket and polling, but prefer websocket
  transports: ['websocket', 'polling'],
  // Increase timeouts for slower connections
  pingTimeout: 60000,
  pingInterval: 25000
});

// In-memory storage: rooms map
// Each room: { name, drawings: [], users: Set }
const rooms = new Map();

// Initialize default room
rooms.set('main-room', { name: 'main-room', drawings: [], users: new Set() });

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send current room list to newly connected client
  socket.emit('rooms-list', Array.from(rooms.keys()));

  // Handle room creation
  socket.on('create-room', (roomName) => {
    if (!roomName) return;
    if (rooms.has(roomName)) {
      socket.emit('room-error', 'Room already exists');
      return;
    }
    rooms.set(roomName, { name: roomName, drawings: [], users: new Set() });
    // Notify all clients about new room
    io.emit('rooms-list', Array.from(rooms.keys()));
    socket.emit('room-created', roomName);
  });

  // Handle joining a room
  socket.on('join-room', (roomName) => {
    // Leave previous rooms
    Array.from(socket.rooms).forEach(r => {
      if (r !== socket.id) {
        socket.leave(r);
        const oldRoom = rooms.get(r);
        if (oldRoom) {
          oldRoom.users.delete(socket.id);
          io.to(r).emit('users-count', oldRoom.users.size);
        }
      }
    });

    // Check if room exists
    if (!rooms.has(roomName)) {
      socket.emit('room-error', `Room "${roomName}" does not exist. Create it first.`);
      return;
    }

    // Join new room
    socket.join(roomName);
    const room = rooms.get(roomName);
    room.users.add(socket.id);

    // Send room data to the user
    socket.emit('room-joined', {
      roomName,
      usersCount: room.users.size,
      drawings: room.drawings   // send all existing drawings
    });

    // Notify others in room about updated user count
    io.to(roomName).emit('users-count', room.users.size);
  });

  // Handle drawing event
  socket.on('drawing', (data) => {
    const { roomName, drawing } = data;
    const room = rooms.get(roomName);
    if (!room) return;

    // Store drawing in room history
    const drawingWithMeta = {
      ...drawing,
      userId: socket.id,
      timestamp: Date.now()
    };
    room.drawings.push(drawingWithMeta);

    // Broadcast to others in the same room
    socket.to(roomName).emit('drawing', drawingWithMeta);
  });

  // Handle clear room
  socket.on('clear-room', (roomName) => {
    const room = rooms.get(roomName);
    if (room) {
      room.drawings = [];
      io.to(roomName).emit('room-cleared');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Remove user from all rooms
    rooms.forEach((room, roomName) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        io.to(roomName).emit('users-count', room.users.size);
      }
    });
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/*
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.get('/', (req, res) => {
  res.json({ message: 'Whiteboard server running', rooms: Array.from(rooms.keys()) });
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store rooms: Map<roomId, { users: Set, drawings: Array }>
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current room list
  socket.emit('rooms-list', Array.from(rooms.keys()));

  // Handle room creation/joining
  socket.on('join-room', ({ roomId, isCreating }) => {
    // Leave all previous rooms
    const currentRooms = Array.from(socket.rooms);
    currentRooms.forEach(r => {
      if (r !== socket.id) {
        socket.leave(r);
      }
    });

    socket.join(roomId);

    // Create room if needed
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Set(),
        drawings: [] // store complete paths
      });
    }

    const room = rooms.get(roomId);
    room.users.add(socket.id);

    // Send room info to user
    socket.emit('room-joined', {
      roomId,
      usersCount: room.users.size
    });

    // Send existing drawings to the user
    if (room.drawings.length > 0) {
      socket.emit('room-history', room.drawings);
    }

    // Broadcast updated user count
    io.to(roomId).emit('users-count', room.users.size);

    // Update room list for all
    io.emit('rooms-list', Array.from(rooms.keys()));
  });

  // Handle drawing (complete path)
  socket.on('drawing', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    // Assign unique ID if not present
    if (!data.id) {
      data.id = `${socket.id}-${Date.now()}-${Math.random()}`;
    }
    data.timestamp = Date.now();

    // Store in room
    room.drawings.push(data);

    // Broadcast to others in room
    socket.to(data.roomId).emit('drawing', data);
  });

  // Handle clear
  socket.on('clear-room', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.drawings = [];
      io.to(roomId).emit('room-cleared');
    }
  });

  // Handle undo (optional)
  socket.on('undo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.drawings.length > 0) {
      room.drawings.pop();
      socket.to(roomId).emit('undo');
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        io.to(roomId).emit('users-count', room.users.size);
        if (room.users.size === 0) {
          // Optionally delete empty rooms after some time, but keep for now
        }
      }
    });
    io.emit('rooms-list', Array.from(rooms.keys()));
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

*/
/*
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"]
}));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Whiteboard Backend Server is Running!',
    status: 'active',
    port: 3001
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store room data
const rooms = new Map(); // Using Map for better performance

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Handle joining a room
  socket.on('join-room', (roomId) => {
    // Leave all previous rooms except the default socket room
    const currentRooms = Array.from(socket.rooms);
    currentRooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join new room
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Set(),
        drawingHistory: [], // Store all drawing paths
        lastActivity: Date.now()
      });
    }

    const room = rooms.get(roomId);
    room.users.add(socket.id);
    room.lastActivity = Date.now();

    // Send room info to the user
    socket.emit('room-joined', { 
      roomId, 
      usersCount: room.users.size 
    });

    // Send existing drawing history to the new user
    if (room.drawingHistory.length > 0) {
      console.log(`Sending ${room.drawingHistory.length} paths to new user`);
      socket.emit('room-history', room.drawingHistory);
    }

    // Update all users in room about new user count
    io.to(roomId).emit('users-count', room.users.size);
  });

  // Handle drawing data
  socket.on('drawing', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    // Store the drawing in history
    if (data.type === 'path-complete') {
      // Store complete path
      room.drawingHistory.push(data.path);
      
      // Limit history size (optional, prevents memory issues)
      if (room.drawingHistory.length > 1000) {
        room.drawingHistory.shift();
      }
    }

    // Broadcast to others in room
    socket.to(data.roomId).emit('drawing', data);
  });

  // Handle clear canvas
  socket.on('clear', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      // Clear history for this room
      room.drawingHistory = [];
      
      // Broadcast clear to everyone in room
      io.to(roomId).emit('clear');
      console.log(`Room ${roomId} cleared`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    // Remove user from all rooms
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        
        // Notify remaining users
        io.to(roomId).emit('users-count', room.users.size);
        
        // Clean up empty rooms (older than 1 hour)
        if (room.users.size === 0 && (Date.now() - room.lastActivity) > 3600000) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (inactive)`);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📡 WebSocket: ws://localhost:${PORT}
  `);
});

*/
/*
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Enable CORS for React app
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"]
}));

// Add a test route so you can see if server is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'Whiteboard Backend Server is Running!',
    status: 'active',
    port: 3001,
    clients: connectedClients,
    rooms: Object.keys(roomUsers).length
  });
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Add connection settings for better performance
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store active users per room
const roomUsers = {};
let connectedClients = 0;

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`✅ New user connected: ${socket.id} (Total: ${connectedClients})`);

  // Send welcome message to the new client
  socket.emit('welcome', { 
    message: 'Connected to whiteboard server',
    socketId: socket.id 
  });

  // Join a room
  socket.on('join-room', (roomId) => {
    // Leave previous rooms
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
        // Remove from roomUsers
        if (roomUsers[room]) {
          roomUsers[room].delete(socket.id);
          io.to(room).emit('users-count', roomUsers[room].size);
        }
      }
    });

    // Join new room
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
    
    // Initialize room if it doesn't exist
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = new Set();
    }
    
    // Add user to room
    roomUsers[roomId].add(socket.id);
    
    // Send user count to room
    io.to(roomId).emit('users-count', roomUsers[roomId].size);
    
    // Confirm join to the user
    socket.emit('room-joined', { 
      roomId, 
      usersCount: roomUsers[roomId].size 
    });
  });

  // Handle drawing data
  socket.on('drawing', (data) => {
    // Log for debugging (remove in production)
    console.log(`Drawing in room ${data.roomId} from ${socket.id}`);
    
    // Send to everyone in room except sender
    socket.to(data.roomId).emit('drawing', data);
  });

  // Handle clear canvas
  socket.on('clear', (roomId) => {
    console.log(`Clear canvas in room ${roomId} from ${socket.id}`);
    socket.to(roomId).emit('clear');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`❌ User disconnected: ${socket.id} (Remaining: ${connectedClients})`);
    
    // Remove user from all rooms
    Object.keys(roomUsers).forEach(roomId => {
      if (roomUsers[roomId].has(socket.id)) {
        roomUsers[roomId].delete(socket.id);
        io.to(roomId).emit('users-count', roomUsers[roomId].size);
        
        // Delete empty room
        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
  🚀 Server is running!
  📡 Port: ${PORT}
  🔗 URL: http://localhost:${PORT}
  📊 WebSocket: ws://localhost:${PORT}
  
  Test the server:
  - http://localhost:${PORT} - Server info
  - http://localhost:${PORT}/health - Health check
  `);
});
*/

/*
// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React app address
    methods: ["GET", "POST"]
  }
});

// Store active users per room
const roomUsers = {};

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = new Set();
    }
    
    // Add user to room
    roomUsers[roomId].add(socket.id);
    
    // Send user count to room
    io.to(roomId).emit('users-count', roomUsers[roomId].size);
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Handle drawing data
  socket.on('drawing', (data) => {
    // Send to everyone in room except sender
    socket.to(data.roomId).emit('drawing', data);
  });

  // Handle clear canvas
  socket.on('clear', (roomId) => {
    socket.to(roomId).emit('clear');
  });

  // Handle disconnection
console.log(socket,"server socket");
  socket.on('disconnect', () => {
    // Remove user from all rooms
    Object.keys(roomUsers).forEach(roomId => {
      if (roomUsers[roomId].has(socket.id)) {
        roomUsers[roomId].delete(socket.id);
        io.to(roomId).emit('users-count', roomUsers[roomId].size);
        
        // Delete empty room
        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
        }
      }
    });
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/