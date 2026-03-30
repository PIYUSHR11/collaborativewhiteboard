//simplified and robust
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export function useSocket(serverUrl) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('rooms-list', (roomList) => {
      setRooms(roomList);
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  const emit = (event, data) => {
    if (socketRef.current) socketRef.current.emit(event, data);
  };

  const on = (event, callback) => {
    if (socketRef.current) socketRef.current.on(event, callback);
  };

  const off = (event, callback) => {
    if (socketRef.current) socketRef.current.off(event, callback);
  };

  return { socket: socketRef.current, isConnected, socketId, rooms, emit, on, off };
}

/*
import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

export function useSocket(serverUrl) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    console.log('🔌 Connecting to:', serverUrl);
    
    // Create socket connection
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    const socket = socketRef.current;

    // Connection handlers
    const onConnect = () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
      setSocketId(socket.id);
    };

    const onDisconnect = (reason) => {
      console.log('❌ Disconnected:', reason);
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    };

    const onReconnect = (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect', onReconnect);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect', onReconnect);
      
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [serverUrl]);

  // Emit event helper
  const emit = useCallback((eventName, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(eventName, data);
      return true;
    }
    console.warn('Cannot emit, socket not connected');
    return false;
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    socketId,
    emit
  };
}
*/
/*
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(serverUrl) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    console.log('🔌 Attempting to connect to:', serverUrl);
    
    // Create socket connection
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });   

    const socket = socketRef.current;

    // Connection event handlers
    const handleConnect = () => {
      console.log('✅ Connected to WebSocket server');
      console.log('🆔 Socket ID:', socket.id);
      setIsConnected(true);
      setSocketId(socket.id);
    };

    const handleWelcome = (data) => {
      console.log('👋 Welcome from server:', data);
    };

    const handleConnectError = (error) => {
      console.error('❌ Connection error:', error.message);
      setIsConnected(false);
    };

    const handleReconnect = (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    };

    const handleReconnectAttempt = (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    };

    const handleReconnectError = (error) => {
      console.error('❌ Reconnection error:', error);
    };

    const handleDisconnect = (reason) => {
      console.log('❌ Disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Reconnect if server disconnected
        socket.connect();
      }
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('welcome', handleWelcome);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('disconnect', handleDisconnect);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      
      // Remove all event listeners
      socket.off('connect', handleConnect);
      socket.off('welcome', handleWelcome);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect_error', handleReconnectError);
      socket.off('disconnect', handleDisconnect);
      
      // Disconnect socket
      socket.disconnect();
    };
  }, [serverUrl]);

  // Emit event function
  const emit = (eventName, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(eventName, data);
    } else {
      console.warn('Socket not connected. Unable to emit event:', eventName);
    }
  };

  // Return the socket instance and state
  return {
    socket: socketRef.current,
    isConnected,
    socketId,
    emit
  };
}

*/

/*
import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export function useSocket(serverUrl) {
  const socketRef = useRef(null);

  useEffect(() => {
  console.log('🔌 Attempting to connect to:', serverUrl);
    // Create socket connection
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection established
    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    // Connection error
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  return socketRef.current;
}
*/