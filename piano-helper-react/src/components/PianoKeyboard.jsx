import React, { useRef, useEffect } from 'react';

function PianoKeyboard() {
  const canvasRef = useRef(null);

  // TODO: Receive notesToHighlight, rootNote, range as props
  // TODO: Implement drawing logic in useEffect using native Canvas API

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Basic placeholder drawing
    context.fillStyle = '#eee';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.fillText('Piano Keyboard Canvas', canvas.width / 2, canvas.height / 2);

  }, []); // Redraw only on mount for now

  return (
    <div style={{ border: '1px solid green', padding: '10px', margin: '10px 0' }}>
      <h2>Piano Keyboard</h2>
      <canvas ref={canvasRef} width={720} height={220} style={{ border: '1px solid #ccc' }}></canvas>
    </div>
  );
}

export default PianoKeyboard; 