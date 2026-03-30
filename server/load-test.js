// backend/load-test.js
const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';
const NUM_USERS = 100; // Start with 10, increase gradually
const ROOM_NAME = 'test-room';

console.log(`Starting load test with ${NUM_USERS} simulated users...`);

const users = [];
let drawingsSent = 0;

for (let i = 0; i < NUM_USERS; i++) {
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: true,
    forceNew: true
  });

  socket.on('connect', () => {
    console.log(`User ${i + 1} connected: ${socket.id}`);
    socket.emit('join-room', ROOM_NAME);

    // Simulate drawing after connection
    setInterval(() => {
      if (drawingsSent < 1000) { // Limit to 1000 total drawings
        socket.emit('drawing', {
          type: 'draw',
          x: Math.random() * 800,
          y: Math.random() * 600,
          roomId: ROOM_NAME,
          brushSize: 5,
          brushColor: '#000000'
        });
        drawingsSent++;
      }
    }, 100); // Send drawing every 100ms
  });

  socket.on('connect_error', (error) => {
    console.error(`User ${i + 1} connection error:`, error.message);
  });

  users.push(socket);
}

// Monitor performance
setInterval(() => {
  console.log(`\n📊 Performance Stats:`);
  console.log(`Connected users: ${users.filter(u => u.connected).length}/${NUM_USERS}`);
  console.log(`Drawings sent: ${drawingsSent}`);
  console.log(`Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
}, 5000);

// Run test for 2 minutes then cleanup
setTimeout(() => {
  console.log('\n🛑 Test complete. Cleaning up...');
  users.forEach(u => u.disconnect());
  process.exit(0);
}, 120000);