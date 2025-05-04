import React, { useRef, useEffect } from 'react';

function PianoKeyboard() {
  const canvasRef = useRef(null);
  const startNote = 60; // C4 (Middle C)
  const numOctaves = 2;
  const numWhiteKeys = 7 * numOctaves + 1; // Include the C at the end of the second octave
  const numKeys = 12 * numOctaves + 1;

  // TODO: Receive notesToHighlight, rootNote, range as props
  // TODO: Implement drawing logic in useEffect using native Canvas API

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // --- Constants ---
    const whiteKeyWidth = canvasWidth / numWhiteKeys;
    const whiteKeyHeight = canvasHeight;
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const blackKeyHeight = whiteKeyHeight * 0.6;
    const whiteKeyColor = '#ffffff';
    const blackKeyColor = '#000000';
    const keyBorderColor = '#cccccc';

    // Clear canvas
    context.fillStyle = whiteKeyColor;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    // --- Draw Keys ---
    let currentWhiteKey = 0;
    for (let i = 0; i < numKeys; i++) {
      const midiNote = startNote + i;
      const note = midiNote % 12; // 0=C, 1=C#, 2=D, ... 11=B
      const isBlackKey = [1, 3, 6, 8, 10].includes(note);
      const keyX = currentWhiteKey * whiteKeyWidth;

      if (!isBlackKey) {
        // Draw White Key
        context.fillStyle = whiteKeyColor;
        context.fillRect(keyX, 0, whiteKeyWidth, whiteKeyHeight);
        context.strokeStyle = keyBorderColor;
        context.strokeRect(keyX, 0, whiteKeyWidth, whiteKeyHeight);
        currentWhiteKey++;
      }
    }

    // Draw Black Keys (on top of white keys)
    currentWhiteKey = 0; // Reset for black key positioning
    for (let i = 0; i < numKeys; i++) {
       const midiNote = startNote + i;
       const note = midiNote % 12;
       const isBlackKey = [1, 3, 6, 8, 10].includes(note);

       if (!isBlackKey) {
           // Check for preceding black key
           const nextNoteIsBlack = [1, 3, 6, 8, 10].includes((note + 1) % 12);
           if (nextNoteIsBlack && note !== 4 && note !== 11) { // Notes E(4) and B(11) don't have sharps
               const blackKeyX = (currentWhiteKey + 1) * whiteKeyWidth - blackKeyWidth / 2;
               context.fillStyle = blackKeyColor;
               context.fillRect(blackKeyX, 0, blackKeyWidth, blackKeyHeight);
           }
           currentWhiteKey++;
       }
    }

    // Basic placeholder drawing - REMOVED
    // context.fillStyle = '#eee';
    // context.fillRect(0, 0, canvas.width, canvas.height);
    // context.fillStyle = 'black';
    // context.textAlign = 'center';
    // context.fillText('Piano Keyboard Canvas', canvas.width / 2, canvas.height / 2);

  }, []); // Redraw only on mount for now

  return (
    <div style={{ border: '1px solid green', padding: '10px', margin: '10px 0' }}>
      <h2>Piano Keyboard</h2>
      <canvas ref={canvasRef} width={720} height={220} style={{ border: '1px solid #ccc' }}></canvas>
    </div>
  );
}

export default PianoKeyboard; 