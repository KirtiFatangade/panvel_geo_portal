import React, { useState, useEffect, useRef } from 'react';

const SphericalController = ({ map }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [crosshairX, setCrosshairX] = useState(25);
  const [crosshairY, setCrosshairY] = useState(25);
  const canvasRef = useRef(null);

  const handleMouseDown = (event) => {
    setIsDragging(true);
    setStartX(event.clientX);
    setStartY(event.clientY);
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event) => {
    if (isDragging) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      setStartX(event.clientX);
      setStartY(event.clientY);

      const pitchChange = dy * 0.1; // Adjust the multiplier to control sensitivity
      const bearingChange = dx * 0.1; // Adjust the multiplier to control sensitivity

      // Update the map pitch and bearing
      if (map) {
        if (pitchChange) {
          const newPitch = map.getPitch() + pitchChange;
          map.setPitch(newPitch);
        }
        if (bearingChange) {
          const newBearing = map.getBearing() + bearingChange;
          map.setBearing(newBearing);
        }
      }

      // Update the crosshair position
      setCrosshairX((prevX) => Math.max(0, Math.min(50, prevX + dx)));
      setCrosshairY((prevY) => Math.max(0, Math.min(50, prevY + dy)));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';

    // Reset the crosshair position when dragging stops
    setCrosshairX(25);
    setCrosshairY(25);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startX, startY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the crosshair
    ctx.beginPath();
    ctx.moveTo(crosshairX, 0);
    ctx.lineTo(crosshairX, canvas.height);
    ctx.moveTo(0, crosshairY);
    ctx.lineTo(canvas.width, crosshairY);
    ctx.strokeStyle = 'black';
    ctx.stroke();
  }, [crosshairX, crosshairY]);

  return (
    <>
      <style>
        {`
          #spherical-controller {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: radial-gradient(circle, #fff, #ccc);
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            cursor: pointer;
            user-select: none;
            margin-left: 93%;
           bottom:211px;
          }
          #spherical-canvas {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.8);
          
          }
        `}
      </style>
      <div
        id="spherical-controller"
        onMouseDown={handleMouseDown}
      >
        <canvas ref={canvasRef} id="spherical-canvas" width="50" height="50"></canvas>
      </div>
    </>
  );
};

export default SphericalController;
