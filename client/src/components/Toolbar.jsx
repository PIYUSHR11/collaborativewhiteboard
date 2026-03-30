//simple toolbar
function Toolbar({ brushSize, setBrushSize, brushColor, setBrushColor, onClear }) {
  console.log(setBrushColor,' toolbar brushcolor')
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];
  return (
    <div className="bg-white p-2 rounded shadow mb-4 flex flex-wrap items-center gap-4">
      <div>
        <label className="block text-sm">Color</label>
        <div className="flex gap-1">
          {colors.map(c => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border-2 ${brushColor === c ? 'border-black' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => setBrushColor(c)}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm">Size: {brushSize}px</label>
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
        />
      </div>
      <button
        onClick={onClear}
        className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
      >
        Clear Room
      </button>
    </div>
  );
}

export default Toolbar;

/*
function Toolbar({ 
  brushSize, 
  setBrushSize, 
  brushColor, 
  setBrushColor, 
  onClear, 
  onUndo 
}) {
  const colors = [
    '#000000', // Black
    '#FF3B30', // Red
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#AF52DE', // Purple
    '#FFFFFF'  // White (eraser)
  ];

  const sizes = [1, 3, 5, 8, 12, 20];

  return (
    <div className="toolbar bg-white p-4 rounded-xl shadow-lg mb-6">
      <div className="flex flex-wrap gap-6 items-center justify-center">
        
        //* Color Picker *
        <div className="color-picker">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Colors</h3>
          <div className="flex gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                className={`w-8 h-8 rounded-full border-2 ${
                  brushColor === color 
                    ? 'border-gray-800 scale-110' 
                    : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color === '#FFFFFF' ? 'Eraser' : color}
              />
            ))}
          </div>
        </div>

        //* Brush Size *
        <div className="brush-size">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Brush Size</h3>
          <div className="flex gap-2">
            {sizes.map(size => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`px-3 py-1 rounded ${
                  brushSize === size
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        //* Action Buttons *
        <div className="actions flex gap-3">
          <button
            onClick={onClear}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Clear All
          </button>
          
          <button
            onClick={onUndo}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Undo
          </button>
        </div>

        //* Current Selection *
        <div className="current-selection flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Selected:</span>
            <div 
              className="w-6 h-6 rounded-full border border-gray-300"
              style={{ backgroundColor: brushColor }}
            />
            <span className="text-sm font-medium">
              {brushColor === '#FFFFFF' ? 'Eraser' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Size:</span>
            <div 
              className="bg-gray-800 rounded-full"
              style={{ 
                width: brushSize, 
                height: brushSize 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
*/