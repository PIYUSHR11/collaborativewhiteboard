//room management ui
import { useState } from 'react';

function UserPanel({ currentRoom, usersCount, rooms, onCreateRoom, onJoinRoom, error }) {
  const [roomInput, setRoomInput] = useState('');
  const [mode, setMode] = useState('join'); // 'join' or 'create'

  const handleSubmit = () => {
    if (!roomInput.trim()) return;
    if (mode === 'create') {
      onCreateRoom(roomInput.trim());
    } else {
      onJoinRoom(roomInput.trim());
    }
    setRoomInput('');
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="bg-blue-100 px-3 py-2 rounded">
          <span className="font-bold">Room:</span> {currentRoom}
        </div>
        <div className="bg-green-100 px-3 py-2 rounded">
          <span className="font-bold">Users:</span> {usersCount}
        </div>
        <div className="flex-1 min-w-[300px]">
          <div className="flex gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="join">Join</option>
              <option value="create">Create</option>
            </select>
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder={mode === 'create' ? 'New room name' : 'Room name'}
              className="flex-1 border rounded px-2 py-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
            >
              {mode === 'create' ? 'Create' : 'Join'}
            </button>
          </div>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>
      </div>
      {rooms.length > 0 && (
        <div className="mt-3">
          <span className="text-sm font-semibold">Available rooms:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {rooms.map(room => (
              <button
                key={room}
                onClick={() => onJoinRoom(room)}
                className={`px-2 py-1 text-sm rounded ${
                  room === currentRoom
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPanel;

/*
import { useState } from 'react';

function UserPanel({ usersCount, roomId, onRoomChange, availableRooms }) {
  const [roomInput, setRoomInput] = useState('');
  const [mode, setMode] = useState('join'); // 'join' or 'create'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const isCreating = mode === 'create';
    onRoomChange(roomInput.trim(), isCreating);
    setRoomInput('');
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold">Current Room:</span> {roomId}
        </div>
        <div>
          <span className="font-semibold">Users:</span> {usersCount}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
        <input
          type="text"
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value)}
          placeholder={mode === 'create' ? 'New room name' : 'Room name'}
          className="border p-2 rounded flex-1"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {mode === 'create' ? 'Create' : 'Join'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'create' ? 'join' : 'create')}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Switch to {mode === 'create' ? 'Join' : 'Create'}
        </button>
      </form>

      {availableRooms.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Available Rooms:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {availableRooms.map(room => (
              <button
                key={room}
                onClick={() => onRoomChange(room, false)}
                className={`px-3 py-1 rounded text-sm ${
                  room === roomId ? 'bg-blue-500 text-white' : 'bg-gray-300'
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPanel;

*/
/*
import { useState, useEffect } from 'react';

function UserPanel({ usersCount, roomId, onRoomChange, availableRooms = [] }) {
  const [newRoomId, setNewRoomId] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = (roomToJoin) => {
    if (roomToJoin && roomToJoin.trim() !== '') {
      onRoomChange(roomToJoin.trim(), false);
      setNewRoomId('');
      setShowCreateRoom(false);
      setError('');
    }
  };

  const handleCreateRoom = () => {
    if (newRoomId && newRoomId.trim() !== '') {
      // Check if room already exists
      if (availableRooms.includes(newRoomId.trim())) {
        setError('Room already exists! Join it instead.');
        return;
      }
      onRoomChange(newRoomId.trim(), true);
      setNewRoomId('');
      setShowCreateRoom(false);
      setError('');
    }
  };

  return (
    <div className="user-panel bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl shadow-md mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
        // Room Info 
        <div className="room-info flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <span className="text-blue-800 font-bold">Current Room:</span>
            <span className="ml-2 text-blue-600 font-mono text-lg">{roomId}</span>
          </div>
          
          <div className="relative">
            <div className="bg-green-100 px-4 py-2 rounded-lg flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-medium">{usersCount} Active</span>
            </div>
          </div>
        </div>

        // Room Controls 
        <div className="room-controls flex flex-col sm:flex-row gap-3">
          {!showCreateRoom ? (
            <>
              <input
                type="text"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom(newRoomId)}
                placeholder="Enter room name to join"
                className="border-2 border-blue-300 px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleJoinRoom(newRoomId)}
                disabled={!newRoomId.trim()}
                className={`px-5 py-2 rounded-lg font-medium transition shadow ${
                  newRoomId.trim() 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Join Room
              </button>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg font-medium transition shadow"
              >
                Create New
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={newRoomId}
                onChange={(e) => {
                  setNewRoomId(e.target.value);
                  setError('');
                }}
                placeholder="Enter new room name"
                className="border-2 border-green-300 px-4 py-2 rounded-lg focus:outline-none focus:border-green-500"
                autoFocus
              />
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomId.trim()}
                className={`px-5 py-2 rounded-lg font-medium transition shadow ${
                  newRoomId.trim() 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomId('');
                  setError('');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-medium transition shadow"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      //* Error Message 
      {error && (
        <div className="mt-3 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      //* Available Rooms *
      {availableRooms.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Available Rooms:</h4>
          <div className="flex flex-wrap gap-2">
            {availableRooms.map(room => (
              <button
                key={room}
                onClick={() => handleJoinRoom(room)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  room === roomId
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {room} {room === roomId && '(current)'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPanel;
*/
/*
import React, {useState} from 'react';
function UserPanel({ usersCount, roomId, onRoomChange }) {
  const [newRoomId, setNewRoomId] = useState(roomId);

  return (
    <div className="user-panel bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl shadow-md mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="room-info">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <span className="text-blue-800 font-bold">Room:</span>
              <span className="ml-2 text-blue-600 font-mono">{roomId}</span>
            </div>
            
            <div className="relative">
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {usersCount}
              </div>
              <div className="bg-green-100 px-3 py-2 rounded-lg">
                <span className="text-green-800 font-medium">Active Users</span>
              </div>
            </div>
          </div>
        </div>

        <div className="room-controls flex gap-3">
          <input
            type="text"
            value={newRoomId}
            onChange={(e) => setNewRoomId(e.target.value)}
            placeholder="Enter room name"
            className="border-2 border-blue-300 px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
          
          <button
            onClick={() => onRoomChange(newRoomId)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-medium transition shadow"
          >
            Switch Room
          </button>
        </div>

        <div className="text-sm text-gray-600 hidden md:block">
          <span className="font-medium">Tip:</span> Share the room name to collaborate
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-700">
            You're connected and broadcasting
          </span>
        </div>
      </div>
    </div>
  );
}

export default UserPanel;
*/