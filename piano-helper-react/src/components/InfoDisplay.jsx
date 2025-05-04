import React, { useMemo } from 'react';
import MusicLogic from '../musicLogic';
import { Scale, Note, Chord } from '@tonaljs/tonal'; // Import Chord

// Instantiate the logic class once
const musicLogic = new MusicLogic();

function InfoDisplay({ selectedRoot, selectedScaleType, selectedChordType, currentMode /* TODO: Add chord props later */ }) {

  let title = '-';
  let notes = []; // Initialize as array
  let formula = '-';
  let midiNotes = []; // Initialize as array

  try {
    if (currentMode === 'scale_display' && selectedRoot && selectedScaleType) {
      const scaleName = `${Note.pitchClass(selectedRoot)} ${selectedScaleType}`;
      const scaleData = Scale.get(scaleName);
      // Ensure notes property exists and is an array
      if (scaleData && Array.isArray(scaleData.notes)) { 
        title = scaleData.name || scaleName;
        notes = scaleData.notes;
        formula = scaleData.intervals.join(' ');
        const rootOctave = Note.octave(selectedRoot) || 4;
        midiNotes = notes.map(noteName => Note.midi(`${noteName}${rootOctave}`)).filter(Boolean);
      } else {
         title = `${scaleName} (Invalid)`; // Indicate invalid scale
      }
    } else if (currentMode === 'chord_display' && selectedRoot && selectedChordType) {
        const chordName = `${Note.pitchClass(selectedRoot)}${selectedChordType}`;
        const chordData = Chord.get(chordName); 
        // Ensure notes property exists and is an array
        if (chordData && Array.isArray(chordData.notes)) {
            title = chordData.name || chordName;
            notes = chordData.notes;
            formula = chordData.intervals.join(' ');
            const rootOctave = Note.octave(selectedRoot) || 4;
            // Recalculate midiNotes based on the found notes and octave
            midiNotes = notes.map(noteName => Note.midi(`${noteName}${rootOctave}`)).filter(Boolean);
            // Original calculation might be slightly different if Chord.getChord handled octave differently
            // midiNotes = Chord.getChord(selectedChordType, `${Note.pitchClass(selectedRoot)}${rootOctave}`).notes.map(Note.midi).filter(Boolean);
        } else {
            title = `${chordName} (Invalid)`; // Indicate invalid chord
        }
    }
  } catch (error) {
      console.error("Error in InfoDisplay:", error);
      title = "Error processing selection";
      notes = []; // Ensure notes is an array on error
      midiNotes = []; // Ensure midiNotes is an array on error
  }

  // Format the data for display - Use the 'notes' array directly for names
  const info = {
    title: title,
    formula: `Formula: ${formula || 'N/A'}`,
    notes: `Notes (MIDI): ${Array.isArray(midiNotes) ? midiNotes.join(', ') : 'N/A'}`,
    noteNames: `Notes: ${Array.isArray(notes) ? notes.join(', ') : 'N/A'}` // <-- Join the 'notes' array directly
  };

  return (
    <div style={{ border: '1px solid orange', padding: '10px', margin: '10px 0' }}>
      <h2>Info Display</h2>
      <h3>{info.title}</h3>
      <p>{info.noteNames}</p>
      <p>{info.formula}</p>
      <p><small>{info.notes}</small></p>
    </div>
  );
}

export default InfoDisplay; 