import React, { useRef, useEffect } from 'react';

function PianoKeyboard({ rootNote, notesToHighlight = [], playedNotes = [], expectedNotes = [] }) {
  const canvasRef = useRef(null);
  // console.log('PianoKeyboard received notesToHighlight:', notesToHighlight);
  // console.log('PianoKeyboard received playedNotes:', playedNotes);
  // console.log('PianoKeyboard received expectedNotes:', expectedNotes);
  const startNote = 36; // C2 - Lowered for split hand voicing
  const numOctaves = 3; // Increased to 3 octaves
  const numWhiteKeys = 7 * numOctaves + 1; // Include the C at the end of the second octave
  const numKeys = 12 * numOctaves + 1;

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
    const highlightColor = '#a0d2ff'; // Light blue for scale notes
    const rootHighlightColor = '#4a90e2'; // Stronger blue for root note
    const activePlayColor = '#90ee90'; // Light green for actively played notes
    const expectedNoteColor = '#ffa500'; // Orange for the next expected note(s)

    // Clear canvas
    context.fillStyle = whiteKeyColor;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    // --- Draw Keys ---
    let currentWhiteKeyX = 0;
    const drawnKeys = []; // Store key info for drawing black keys later

    // Draw White Keys first and store positions
    for (let i = 0; i < numKeys; i++) {
      const midiNote = startNote + i;
      const note = midiNote % 12;
      const isBlackKey = [1, 3, 6, 8, 10].includes(note);

      if (!isBlackKey) {
        const keyX = currentWhiteKeyX;
        const keyWidth = whiteKeyWidth;
        const keyHeight = whiteKeyHeight;
        const isRoot = midiNote === rootNote;
        const isHighlighted = notesToHighlight.includes(midiNote);
        const isActive = playedNotes.includes(midiNote);
        const isExpected = expectedNotes.includes(midiNote);

        // Determine fill color priority: Active > Expected > Root > Highlight > Default
        let fillColor = whiteKeyColor;
        if (isHighlighted) fillColor = highlightColor;
        if (isRoot && isHighlighted) fillColor = rootHighlightColor; // Root takes precedence over regular highlight
        if (isExpected) fillColor = expectedNoteColor; // Expected overrides blue highlights
        if (isActive) fillColor = activePlayColor; // Active overrides all others

        context.fillStyle = fillColor;
        context.fillRect(keyX, 0, keyWidth, keyHeight);
        context.strokeStyle = keyBorderColor;
        context.strokeRect(keyX, 0, keyWidth, keyHeight);

        drawnKeys.push({ midiNote, isBlackKey: false, x: keyX, width: keyWidth, height: keyHeight });
        currentWhiteKeyX += whiteKeyWidth;
      }
    }

    // Draw Black Keys (on top of white keys), using stored white key positions
    let whiteKeyIndex = 0;
    for (let i = 0; i < numKeys; i++) {
      const midiNote = startNote + i;
      const note = midiNote % 12;
      const isBlackKey = [1, 3, 6, 8, 10].includes(note);

      if (!isBlackKey) {
        // Find the position of the current white key in our drawnKeys array (or calculate based on index)
        const whiteKeyX = drawnKeys.find(k => !k.isBlackKey && k.midiNote === midiNote)?.x ?? (whiteKeyIndex * whiteKeyWidth);

        // Check if the *next* key in the scale is black (C#, D#, F#, G#, A#)
        const nextNoteIsBlack = [1, 3, 6, 8, 10].includes((note + 1) % 12);
        if (nextNoteIsBlack && note !== 4 && note !== 11) { // E and B don't have sharps after them
           const blackKeyX = whiteKeyX + whiteKeyWidth - (blackKeyWidth / 2);
           const blackMidiNote = midiNote + 1;
           const isRoot = blackMidiNote === rootNote;
           const isHighlighted = notesToHighlight.includes(blackMidiNote);
           const isActive = playedNotes.includes(blackMidiNote);
           const isExpected = expectedNotes.includes(blackMidiNote);

           // Determine fill color priority: Active > Expected > Root > Highlight > Default
           let fillColor = blackKeyColor;
           if (isHighlighted) fillColor = highlightColor;
           if (isRoot && isHighlighted) fillColor = rootHighlightColor;
           if (isExpected) fillColor = expectedNoteColor;
           if (isActive) fillColor = activePlayColor;

           context.fillStyle = fillColor;
           context.fillRect(blackKeyX, 0, blackKeyWidth, blackKeyHeight);
           // Optionally add border to black keys
           context.strokeStyle = keyBorderColor;
           context.strokeRect(blackKeyX, 0, blackKeyWidth, blackKeyHeight);

           drawnKeys.push({ midiNote: blackMidiNote, isBlackKey: true, x: blackKeyX, width: blackKeyWidth, height: blackKeyHeight });
        }
        whiteKeyIndex++;
      }
    }

    // Basic placeholder drawing - REMOVED
    // context.fillStyle = '#eee';
    // context.fillRect(0, 0, canvas.width, canvas.height);
    // context.fillStyle = 'black';
    // context.textAlign = 'center';
    // context.fillText('Piano Keyboard Canvas', canvas.width / 2, canvas.height / 2);

  }, [rootNote, notesToHighlight, startNote, numOctaves, playedNotes, expectedNotes]); // Redraw when props change

  return (
    <div style={{ border: '1px solid green', padding: '10px', margin: '10px 0' }}>
      <h2>Piano Keyboard</h2>
      <canvas ref={canvasRef} width={720} height={220} style={{ border: '1px solid #ccc' }}></canvas>
    </div>
  );
}

export default PianoKeyboard; 