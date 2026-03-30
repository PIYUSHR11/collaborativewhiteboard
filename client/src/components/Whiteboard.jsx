//main component with clear logic
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import Toolbar from './Toolbar';
import UserPanel from './UserPanel';

function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [currentRoom, setCurrentRoom] = useState('main-room');
  const [usersCount, setUsersCount] = useState(1);
  const [roomError, setRoomError] = useState('');

// 🔥 FIX: Use refs to track current brush settings for drawing
  const brushSizeRef = useRef(5);
  const brushColorRef = useRef('#000000');
  const currentPathRef = useRef([]);
  const drawingsRef = useRef([]);

  const { socket, isConnected, rooms, emit, on, off } = useSocket('http://localhost:3001');

  // Store drawings for current room
  // const drawingsRef = useRef([]);

 // 🔥 FIX: Update refs when state changes
  useEffect(() => {
    brushSizeRef.current = brushSize;
    brushColorRef.current = brushColor;
    
    // Also update canvas context
    if (ctxRef.current) {
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.strokeStyle = brushColor;
    }
  }, [brushSize, brushColor]);

  // Initialize canvas
  useEffect(() => {
    console.log(brushColor,'canvas brushcolor');

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    ctxRef.current = ctx;

    const resize = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawAll();
    };
    window.addEventListener('resize', resize);
    resize();

    return () => window.removeEventListener('resize', resize);
  }, []);

  // Redraw all stored drawings
  const redrawAll = useCallback(() => {
     console.log(ctxRef.current,' ctxref');
     console.log(brushColor,' redraw brushColor');
    const ctx = ctxRef.current;
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawingsRef.current.forEach(d => {
      if (d.points && d.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i = 1; i < d.points.length; i++) {
          ctx.lineTo(d.points[i].x, d.points[i].y);
        }
        ctx.strokeStyle = d.color;
        ctx.lineWidth = d.size;
        ctx.stroke();
      }
    });
    // Restore current settings
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  }, [brushColor, brushSize]);

  // Join room function
  const joinRoom = (roomName) => {
    if (!roomName) return;
    emit('join-room', roomName);
  };

  // Create room function
  const createRoom = (roomName) => {
    if (!roomName) return;
    emit('create-room', roomName);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data) => {
      setCurrentRoom(data.roomName);
      setUsersCount(data.usersCount);
      drawingsRef.current = data.drawings || [];
      redrawAll();
      setRoomError('');
    };

    const handleRoomError = (msg) => {
      setRoomError(msg);
    };

    const handleRoomCreated = (roomName) => {
      // Automatically join the newly created room
      joinRoom(roomName);
    };

    const handleDrawing = (drawing) => {
      drawingsRef.current.push(drawing);
      // Draw immediately
      const ctx = ctxRef.current;
      if (ctx && drawing.points && drawing.points.length > 1) {
        ctx.save();
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.size;
        ctx.beginPath();
        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
        for (let i = 1; i < drawing.points.length; i++) {
          ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    };

    const handleUsersCount = (count) => {
      setUsersCount(count);
    };

    const handleRoomCleared = () => {
      drawingsRef.current = [];
      redrawAll();
    };

    on('room-joined', handleRoomJoined);
    on('room-error', handleRoomError);
    on('room-created', handleRoomCreated);
    on('drawing', handleDrawing);
    on('users-count', handleUsersCount);
    on('room-cleared', handleRoomCleared);

    return () => {
      off('room-joined', handleRoomJoined);
      off('room-error', handleRoomError);
      off('room-created', handleRoomCreated);
      off('drawing', handleDrawing);
      off('users-count', handleUsersCount);
      off('room-cleared', handleRoomCleared);
    };
  }, [socket, on, off, redrawAll]);

  // Auto-join default room on connect
  useEffect(() => {
    if (isConnected && currentRoom) {
      joinRoom(currentRoom);
    }
  }, [isConnected]);

  // Drawing handlers
  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
    // Start a new path array
    window.currentPath = [{ x, y }];
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    window.currentPath.push({ x, y });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Send complete path to server
    if (window.currentPath && window.currentPath.length > 1) {
      const drawing = {
        points: window.currentPath,
        color: brushColor,
        size: brushSize
      };
      // Store locally
      drawingsRef.current.push(drawing);
      // Emit to server
      emit('drawing', { roomName: currentRoom, drawing });
    }
    window.currentPath = [];
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const clearRoom = () => {
    emit('clear-room', currentRoom);
  };

  return (
    <div className="p-4">
      <div className={`text-center p-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <UserPanel
        currentRoom={currentRoom}
        usersCount={usersCount}
        rooms={rooms}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        error={roomError}
      />

      <Toolbar
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        onClear={clearRoom}
      />

      <div className="canvas-wrapper border-4 border-gray-300 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[70vh] cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
}

export default Whiteboard;

/*
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import Toolbar from './Toolbar';
import UserPanel from './UserPanel';

function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [roomId, setRoomId] = useState('main-room');
  const [usersCount, setUsersCount] = useState(1);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  const { socket, isConnected } = useSocket('http://localhost:3001');

  // Store drawings by ID to prevent duplicates
  const drawingsMapRef = useRef(new Map());
  // Current path being drawn
  const currentPathRef = useRef([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = brushColor;
      ctxRef.current = ctx;
      setIsCanvasReady(true);
      redrawAllDrawings();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Update brush settings when changed
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.strokeStyle = brushColor;
    }
  }, [brushSize, brushColor]);

  // Join room when socket ready
  useEffect(() => {
    if (socket && isConnected && roomId) {
      socket.emit('join-room', { roomId, isCreating: false });
    }
  }, [socket, isConnected, roomId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleRoomsList = (rooms) => {
      setAvailableRooms(rooms);
    };

    const handleRoomJoined = (data) => {
      setUsersCount(data.usersCount);
    };

    const handleRoomHistory = (drawings) => {
      // Clear current map and add all history drawings
      drawingsMapRef.current.clear();
      drawings.forEach(d => {
        drawingsMapRef.current.set(d.id, d);
      });
      redrawAllDrawings();
    };

    const handleDrawing = (data) => {
      // Prevent duplicates
      if (drawingsMapRef.current.has(data.id)) return;
      drawingsMapRef.current.set(data.id, data);
      drawPath(data);
    };

    const handleUsersCount = (count) => {
      setUsersCount(count);
    };

    const handleRoomCleared = () => {
      drawingsMapRef.current.clear();
      clearCanvas();
    };

    const handleUndo = () => {
      // Remove last drawing
      const keys = Array.from(drawingsMapRef.current.keys());
      if (keys.length > 0) {
        drawingsMapRef.current.delete(keys[keys.length - 1]);
        redrawAllDrawings();
      }
    };

    socket.on('rooms-list', handleRoomsList);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-history', handleRoomHistory);
    socket.on('drawing', handleDrawing);
    socket.on('users-count', handleUsersCount);
    socket.on('room-cleared', handleRoomCleared);
    socket.on('undo', handleUndo);

    return () => {
      socket.off('rooms-list', handleRoomsList);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-history', handleRoomHistory);
      socket.off('drawing', handleDrawing);
      socket.off('users-count', handleUsersCount);
      socket.off('room-cleared', handleRoomCleared);
      socket.off('undo', handleUndo);
    };
  }, [socket]);

  // Redraw all drawings from map
  const redrawAllDrawings = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawings = Array.from(drawingsMapRef.current.values()).sort((a, b) => a.timestamp - b.timestamp);
    drawings.forEach(d => drawPath(d));
  }, []);

  // Draw a single path
  const drawPath = (data) => {
    const ctx = ctxRef.current;
    if (!ctx || !data.points || data.points.length < 2) return;
    
    ctx.save();
    ctx.lineWidth = data.brushSize || 5;
    ctx.strokeStyle = data.brushColor || '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(data.points[0].x, data.points[0].y);
    for (let i = 1; i < data.points.length; i++) {
      ctx.lineTo(data.points[i].x, data.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Get coordinates relative to canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    if (!ctxRef.current || !isCanvasReady) return;
    const { x, y } = getCoordinates(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
    currentPathRef.current = [{ x, y }];
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !ctxRef.current) return;
    const { x, y } = getCoordinates(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    currentPathRef.current.push({ x, y });
  };

  const stopDrawing = () => {
    if (!isDrawing || currentPathRef.current.length < 2) {
      setIsDrawing(false);
      currentPathRef.current = [];
      return;
    }

    const pathData = {
      id: `${socket?.id}-${Date.now()}-${Math.random()}`,
      type: 'path',
      points: [...currentPathRef.current],
      brushSize,
      brushColor,
      roomId,
      timestamp: Date.now()
    };

    // Store locally
    drawingsMapRef.current.set(pathData.id, pathData);
    // Send to server
    if (socket && isConnected) {
      socket.emit('drawing', pathData);
    }

    setIsDrawing(false);
    currentPathRef.current = [];
  };

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleClearRoom = () => {
    drawingsMapRef.current.clear();
    clearCanvas();
    if (socket && isConnected) {
      socket.emit('clear-room', roomId);
    }
  };

  const handleRoomChange = (newRoomId, isCreating = false) => {
    if (!newRoomId || newRoomId.trim() === '' || newRoomId === roomId) return;
    
    // Check if room exists when not creating
    if (!isCreating && !availableRooms.includes(newRoomId)) {
      alert('Room does not exist. Create it first.');
      return;
    }

    setRoomId(newRoomId);
    drawingsMapRef.current.clear();
    clearCanvas();

    if (socket && isConnected) {
      socket.emit('join-room', { roomId: newRoomId, isCreating });
    }
  };

  return (
    <div className="p-4">
      //* Connection status bar *
      <div className={`fixed top-0 left-0 right-0 p-2 text-center text-white ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <div className="mt-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4">Collaborative Whiteboard</h1>

        <UserPanel
          usersCount={usersCount}
          roomId={roomId}
          onRoomChange={handleRoomChange}
          availableRooms={availableRooms}
        />

        <Toolbar
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          onClear={handleClearRoom}
          onUndo={() => socket?.emit('undo', { roomId })}
        />

        <div className="canvas-wrapper border-4 border-gray-800 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[70vh] cursor-crosshair touch-none"
          />
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Room: {roomId} | Users: {usersCount} | Drawings: {drawingsMapRef.current.size}
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;
*/
/*
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import Toolbar from './Toolbar';
import UserPanel from './UserPanel';

function Whiteboard() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [roomId, setRoomId] = useState('main-room');
  const [usersCount, setUsersCount] = useState(1);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  const { socket, isConnected, socketId } = useSocket('http://localhost:3001');
  
  // Store all drawings
  const drawingsRef = useRef(new Map()); // Store by ID to prevent duplicates
  const currentPathRef = useRef([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = brushColor;
      
      contextRef.current = ctx;
      setIsCanvasReady(true);
      
      // Redraw all stored drawings
      redrawAllDrawings();
    };

    initCanvas();

    const handleResize = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      if (contextRef.current) {
        contextRef.current.lineCap = 'round';
        contextRef.current.lineJoin = 'round';
        contextRef.current.lineWidth = brushSize;
        contextRef.current.strokeStyle = brushColor;
      }
      
      redrawAllDrawings();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update brush settings
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.lineWidth = brushSize;
      contextRef.current.strokeStyle = brushColor;
    }
  }, [brushSize, brushColor]);

  // Join room when connected
  useEffect(() => {
    if (socket && isConnected && roomId) {
      console.log('Joining room:', roomId);
      socket.emit('join-room', { roomId, isCreating: false });
    }
  }, [socket, isConnected, roomId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomsList = (rooms) => {
      console.log('Available rooms:', rooms);
      setAvailableRooms(rooms);
    };

    const handleRoomJoined = (data) => {
      console.log('Room joined:', data);
      setUsersCount(data.usersCount);
      // Clear local drawings when switching rooms
      drawingsRef.current.clear();
      clearCanvas();
    };

    const handleDrawing = (data) => {
      // Check if we already have this drawing
      if (data.id && drawingsRef.current.has(data.id)) {
        return; // Skip duplicate
      }

      // Store drawing
      if (data.id) {
        drawingsRef.current.set(data.id, data);
      }

      // Draw on canvas
      drawFromData(data);
    };

    const handleUsersCount = (count) => {
      setUsersCount(count);
    };

    const handleRoomCleared = () => {
      drawingsRef.current.clear();
      clearCanvas();
    };

    const handleUndo = ({ pathId }) => {
      // Implement undo logic
    };

    socket.on('rooms-list', handleRoomsList);
    socket.on('room-joined', handleRoomJoined);
    socket.on('drawing', handleDrawing);
    socket.on('users-count', handleUsersCount);
    socket.on('room-cleared', handleRoomCleared);
    socket.on('undo', handleUndo);

    // Request rooms list
    socket.emit('get-rooms');

    return () => {
      socket.off('rooms-list', handleRoomsList);
      socket.off('room-joined', handleRoomJoined);
      socket.off('drawing', handleDrawing);
      socket.off('users-count', handleUsersCount);
      socket.off('room-cleared', handleRoomCleared);
      socket.off('undo', handleUndo);
    };
  }, [socket]);

  // Redraw all stored drawings
  const redrawAllDrawings = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx || !canvasRef.current) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Redraw all stored drawings in order
    const sortedDrawings = Array.from(drawingsRef.current.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    sortedDrawings.forEach(drawing => {
      if (drawing.type === 'path-complete' && drawing.points) {
        drawPath(ctx, drawing.points, drawing.brushSize, drawing.brushColor);
      }
    });
  }, []);

  // Helper to draw a complete path
  const drawPath = (ctx, points, size, color) => {
    if (!points || points.length < 2) return;
    
    ctx.save();
    ctx.lineWidth = size || 5;
    ctx.strokeStyle = color || '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  };

  // Get coordinates helper
  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (event.touches) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    // Ensure coordinates are within canvas bounds
    return {
      x: Math.max(0, Math.min(canvas.width, x)),
      y: Math.max(0, Math.min(canvas.height, y))
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    
    if (!contextRef.current || !canvasRef.current || !isCanvasReady) return;
    
    const { x, y } = getCoordinates(event);
    
    const ctx = contextRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setIsDrawing(true);
    currentPathRef.current = [{ x, y }];
  };

  const draw = (event) => {
    event.preventDefault();
    
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;
    
    const { x, y } = getCoordinates(event);
    
    const ctx = contextRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();
    
    currentPathRef.current.push({ x, y });
  };

  const drawFromData = (data) => {
    if (!contextRef.current || !canvasRef.current) return;
    
    if (data.type === 'path-complete' && data.points) {
      drawPath(contextRef.current, data.points, data.brushSize, data.brushColor);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || currentPathRef.current.length < 2) {
      setIsDrawing(false);
      currentPathRef.current = [];
      return;
    }
    
    // Create complete path object
    const pathData = {
      type: 'path-complete',
      points: [...currentPathRef.current],
      brushSize,
      brushColor,
      roomId,
      timestamp: Date.now(),
      id: `${socketId}-${Date.now()}-${Math.random()}`
    };
    
    // Store locally
    drawingsRef.current.set(pathData.id, pathData);
    
    // Send to server
    if (socket && isConnected) {
      socket.emit('drawing', pathData);
    }
    
    setIsDrawing(false);
    currentPathRef.current = [];
  };

  const clearCanvas = () => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingsRef.current.clear();
  };

  const handleClearRoom = () => {
    clearCanvas();
    
    if (socket && isConnected) {
      socket.emit('clear-room', roomId);
    }
  };

  const handleRoomChange = (newRoomId, isCreating = false) => {
    if (newRoomId && newRoomId.trim() !== '' && newRoomId !== roomId) {
      console.log(`Changing to room: ${newRoomId} (create: ${isCreating})`);
      setRoomId(newRoomId);
      
      // Clear local drawings
      drawingsRef.current.clear();
      clearCanvas();
      
      // Join new room
      if (socket && isConnected) {
        socket.emit('join-room', { roomId: newRoomId, isCreating });
      }
    }
  };

  return (
    <div className="whiteboard-page p-4 md:p-6">
      // Connection Status 
      <div className={`fixed top-0 left-0 right-0 p-2 text-center text-white z-50 ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div className="max-w-7xl mx-auto mt-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎨 Collaborative Whiteboard
          </h1>
          <p className="text-gray-600">
            Draw together in real-time - Drawings persist per room
          </p>
        </header>

        <UserPanel 
          usersCount={usersCount}
          roomId={roomId}
          onRoomChange={handleRoomChange}
          availableRooms={availableRooms}
        />

        <Toolbar
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          onClear={handleClearRoom}
          onUndo={() => {}}
        />

        <div className="canvas-wrapper bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-gray-800 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[70vh] cursor-crosshair touch-none"
            style={{ backgroundColor: 'white' }}
          />
          
          {!isCanvasReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
              <div className="text-gray-600">Loading canvas...</div>
            </div>
          )}
        </div>

        // Room Info Footer 
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
          <p>📍 Current Room: <strong>{roomId}</strong> | 
             👥 Users: <strong>{usersCount}</strong> | 
             🖼️ Drawings: <strong>{drawingsRef.current.size}</strong> |
             💾 Data persists on server until restart
          </p>
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;
*/

/*
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import Toolbar from './Toolbar';
import UserPanel from './UserPanel';

function Whiteboard() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [roomId, setRoomId] = useState('main-room');
  const [usersCount, setUsersCount] = useState(1);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  const { socket, isConnected, socketId, emit } = useSocket('http://localhost:3001');
  
  // Store current path
  const currentPathRef = useRef([]);
  const allPathsRef = useRef([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Restore context settings after resize
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = brushColor;
      
      contextRef.current = ctx;
      
      // Redraw all paths after resize
      redrawAllPaths();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initial context setup
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    contextRef.current = ctx;
    
    setIsCanvasReady(true);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Update brush settings when they change
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.lineWidth = brushSize;
      contextRef.current.strokeStyle = brushColor;
    }
  }, [brushSize, brushColor]);

  // Handle room joining
  useEffect(() => {
    if (socket && isConnected && roomId) {
      console.log('Joining room:', roomId);
      socket.emit('join-room', roomId);
    }
  }, [socket, isConnected, roomId]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data) => {
      console.log('Room joined:', data);
      setUsersCount(data.usersCount);
    };

    const handleRoomHistory = (history) => {
      console.log('Received room history:', history.length, 'paths');
      allPathsRef.current = history;
      redrawAllPaths();
    };

    const handleDrawing = (data) => {
      drawFromData(data);
    };

    const handleUsersCount = (count) => {
      setUsersCount(count);
    };

    const handleClear = () => {
      clearCanvas(false); // false means don't emit to server
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('room-history', handleRoomHistory);
    socket.on('drawing', handleDrawing);
    socket.on('users-count', handleUsersCount);
    socket.on('clear', handleClear);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-history', handleRoomHistory);
      socket.off('drawing', handleDrawing);
      socket.off('users-count', handleUsersCount);
      socket.off('clear', handleClear);
    };
  }, [socket]);

  // Redraw all paths function
  const redrawAllPaths = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx || !canvasRef.current) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Redraw all stored paths
    allPathsRef.current.forEach(path => {
      if (path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.stroke();
      }
    });
  }, []);

  // Get coordinates helper
  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (event.touches) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    
    if (!contextRef.current || !canvasRef.current) return;
    
    const { x, y } = getCoordinates(event);
    
    const ctx = contextRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setIsDrawing(true);
    currentPathRef.current = [{ x, y }];
    
    // Notify others about start of drawing
    if (socket && isConnected) {
      socket.emit('drawing', {
        type: 'start',
        x,
        y,
        brushSize,
        brushColor,
        roomId
      });
    }
  };

  const draw = (event) => {
    event.preventDefault();
    
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;
    
    const { x, y } = getCoordinates(event);
    
    const ctx = contextRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Add to current path
    currentPathRef.current.push({ x, y });
    
    // Send drawing data (throttled by server)
    if (socket && isConnected) {
      socket.emit('drawing', {
        type: 'draw',
        x,
        y,
        brushSize,
        brushColor,
        roomId
      });
    }
  };

  const drawFromData = (data) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    
    // Save current context settings
    const currentLineWidth = ctx.lineWidth;
    const currentStrokeStyle = ctx.strokeStyle;
    
    // Apply remote user's settings
    ctx.lineWidth = data.brushSize || 5;
    ctx.strokeStyle = data.brushColor || '#000000';
    
    if (data.type === 'start') {
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    } else if (data.type === 'draw') {
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    } else if (data.type === 'path-complete' && data.path) {
      // Draw complete path
      if (data.path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(data.path[0].x, data.path[0].y);
        
        for (let i = 1; i < data.path.length; i++) {
          ctx.lineTo(data.path[i].x, data.path[i].y);
        }
        
        ctx.stroke();
        
        // Store in history
        allPathsRef.current.push(data.path);
      }
    }
    
    // Restore local settings
    ctx.lineWidth = currentLineWidth;
    ctx.strokeStyle = currentStrokeStyle;
  };

  const stopDrawing = (event) => {
    event.preventDefault();
    
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    // Save complete path to history
    if (currentPathRef.current.length > 1) {
      allPathsRef.current.push([...currentPathRef.current]);
      
      // Send complete path to server for history
      if (socket && isConnected) {
        socket.emit('drawing', {
          type: 'path-complete',
          path: [...currentPathRef.current],
          roomId
        });
      }
    }
    
    currentPathRef.current = [];
  };

  const clearCanvas = (emitToServer = true) => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear history
    allPathsRef.current = [];
    currentPathRef.current = [];
    
    // Notify server if needed
    if (emitToServer && socket && isConnected) {
      socket.emit('clear', roomId);
    }
  };

  const undoLast = () => {
    if (allPathsRef.current.length === 0) return;
    
    // Remove last path
    allPathsRef.current.pop();
    
    // Redraw everything
    redrawAllPaths();
  };

  const handleRoomChange = (newRoomId) => {
    if (newRoomId && newRoomId.trim() !== '') {
      setRoomId(newRoomId.trim());
      // Clear local canvas when switching rooms
      clearCanvas(false);
    }
  };

  return (
    <div className="whiteboard-page p-4 md:p-6">
      <div className={`fixed top-0 left-0 right-0 p-2 text-center text-white z-50 ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'} 
        {socketId && ` | ID: ${socketId.slice(0, 8)}...`}
        {!isCanvasReady && ' | Initializing canvas...'}
      </div>

      <div className="max-w-7xl mx-auto mt-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎨 Collaborative Whiteboard
          </h1>
          <p className="text-gray-600">
            Draw together in real-time
          </p>
        </header>

        <UserPanel 
          usersCount={usersCount}
          roomId={roomId}
          onRoomChange={handleRoomChange}
        />

        <Toolbar
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          onClear={() => clearCanvas(true)}
          onUndo={undoLast}
        />

        <div className="canvas-wrapper bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-gray-800 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[70vh] cursor-crosshair touch-none"
            style={{ backgroundColor: 'white' }}
          />
          
          {!isCanvasReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
              <div className="text-gray-600">Loading canvas...</div>
            </div>
          )}
        </div>

        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <p>Paths stored: {allPathsRef.current.length} | Drawing: {isDrawing ? 'Yes' : 'No'}</p>
          <p>Room: {roomId} | Users: {usersCount} | Connected: {isConnected ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;

*/

/*
import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useCanvas } from '../hooks/useCanvas';
import { throttle } from '../utils/throttle';
import Toolbar from './Toolbar';
import UserPanel from './UserPanel';

function Whiteboard() {
  const [roomId, setRoomId] = useState('main-room');
  const [usersCount, setUsersCount] = useState(1);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');

  const { socket } = useSocket('http://localhost:3001');           //set using env
  const {
    canvasRef,
    context,
    isDrawing,
    setIsDrawing,
    drawingHistory,
    setDrawingHistory,
    currentPath,
    setCurrentPath
  } = useCanvas(brushSize, brushColor);

  useEffect(() => {
    if (socket) {
      socket.emit('join-room', roomId);
    }
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleDrawing = (data) => {
      drawFromData(data);
    };

    const handleUserCount = (count) => {
      setUsersCount(count);
    };

    const handleClear = () => {
      clearCanvas();
    };

    // Listen for socket events
    socket.on('drawing', handleDrawing);
    socket.on('users-count', handleUserCount);
    socket.on('clear', handleClear);

    return () => {
      socket.off('drawing', handleDrawing);
      socket.off('users-count', handleUserCount);
      socket.off('clear', handleClear);
    };
  }, [socket]);

  useEffect(() => {
    if (context) {
      context.lineWidth = brushSize;
      context.strokeStyle = brushColor;
    }
  }, [context, brushSize, brushColor]);

  const startDrawing = (event) => {
    if (!context) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);

    if (socket) {
      socket.emit('drawing', {
        type: 'start',
        x,
        y,
        brushSize,
        brushColor,
        roomId
      });
    }
  };

  const draw = throttle((event) => {
    if (!isDrawing || !context) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();

    const newPath = [...currentPath, { x, y }];
    setCurrentPath(newPath);

    if (socket) {
      socket.emit('drawing', {
        type: 'draw',
        x,
        y,
        brushSize,
        brushColor,
        roomId
      });
    }
  }, 16);

  const drawFromData = (data) => {
    if (!context) return;

    context.lineWidth = data.brushSize || 5;
    context.strokeStyle = data.brushColor || '#000000';

    if (data.type === 'start') {
      context.beginPath();
      context.moveTo(data.x, data.y);
    } else if (data.type === 'draw') {
      context.lineTo(data.x, data.y);
      context.stroke();
    }

    context.lineWidth = brushSize;
    context.strokeStyle = brushColor;
  };

  const stopDrawing = () => {
    if (!context) return;

    context.closePath();
    setIsDrawing(false);

    if (currentPath.length > 1) {
      setDrawingHistory([...drawingHistory, currentPath]);
    }
    setCurrentPath([]);
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;

    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setDrawingHistory([]);

    if (socket) {
      socket.emit('clear', roomId);
    }
  };

  const undoLast = () => {
    if (drawingHistory.length === 0) return;

    const newHistory = drawingHistory.slice(0, -1);
    setDrawingHistory(newHistory);

    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      newHistory.forEach(path => {
        if (path.length > 0) {
          context.beginPath();
          context.moveTo(path[0].x, path[0].y);

          path.forEach(point => {
            context.lineTo(point.x, point.y);
          });

          context.stroke();
        }
      });
    }
  };

  const handleRoomChange = (newRoomId) => {
    if (newRoomId.trim() !== '') {
      setRoomId(newRoomId);
      clearCanvas();
    }
  };

  return (
    <div className="whiteboard-page p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎨 Collaborative Whiteboard
          </h1>
          <p className="text-gray-600">
            Draw together in real-time with unlimited users
          </p>
        </header>

        <UserPanel 
          usersCount={usersCount}
          roomId={roomId}
          onRoomChange={handleRoomChange}
        />

        <Toolbar
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          onClear={clearCanvas}
          onUndo={undoLast}
        />

        <div className="canvas-wrapper bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-gray-800">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[70vh] cursor-crosshair"
          />
        </div>

        <div className="instructions mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
          <h3 className="text-xl font-bold mb-4 text-gray-800">How to Collaborate:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-blue-500 font-bold mb-2">1. Share Room</div>
              <p>Copy the room name above and share it with others</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-green-500 font-bold mb-2">2. Draw Together</div>
              <p>Everyone's drawings appear instantly on all screens</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-purple-500 font-bold mb-2">3. Customize</div>
              <p>Use the toolbar to change colors, brush size, and more</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;

*/