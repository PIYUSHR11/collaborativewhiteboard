import { useRef, useEffect, useState } from 'react';

export function useCanvas(initialLineWidth = 5, initialColor = '#000000') {
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set initial styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = initialLineWidth;
    ctx.strokeStyle = initialColor;
    
    // Handle high DPI screens (retina displays)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Set context
    setContext(ctx);

    // Handle window resize
    const handleResize = () => {
       if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      // Restore styles after resize
      ctx.lineCap = '  iund';
      ctx.lineJoin = 'round';
      ctx.lineWidth = initialLineWidth;
      ctx.strokeStyle = initialColor;

      // Redraw history
      redrawHistory(ctx);

    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialLineWidth, initialColor]);

  const redrawHistory = (ctx) => {
    // if (!ctx) return;
        if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    drawingHistory.forEach(path => {
      if (path.length > 0) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        path.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        
        ctx.stroke();
      }
    });
  };

 // Redraw when history changes
useEffect(() => {
    if (context && canvasRef.current) {
      redrawHistory(context);
    }
  }, [drawingHistory, context]);

  return {
    canvasRef,
    context,
    isDrawing,
    setIsDrawing,
    drawingHistory,
    setDrawingHistory,
    currentPath,
    setCurrentPath
  };
}