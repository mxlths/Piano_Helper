import React, { useMemo } from 'react';
import MusicLogic from '../musicLogic';
import { Scale, Note, Chord } from '@tonaljs/tonal'; // Import Chord

// Instantiate the logic class once
const musicLogic = new MusicLogic();

function InfoDisplay({ selectedRoot, selectedScaleType, selectedChordType, currentMode /* TODO: Add chord props later */ }) {

  let title = '-';
  let notes = [];
  let formula = '-';
  let midiNotes = [];

  try {
    if (currentMode === 'scale_display' && selectedRoot && selectedScaleType) {
      const scaleName = `${Note.pitchClass(selectedRoot)} ${selectedScaleType}`;
      const scaleData = Scale.get(scaleName); // Use Tonal to get scale data
      if (scaleData && scaleData.notes) {
        title = scaleName;
        notes = scaleData.notes; 
        formula = scaleData.intervals.join(' ');
        // Calculate MIDI notes for display (maybe just the first octave)
        const rootOctave = Note.octave(selectedRoot) || 4; // Default octave if not provided
        midiNotes = notes.map(noteName => Note.midi(`${noteName}${rootOctave}`)).filter(Boolean);
      }
    } else if (currentMode === 'chord_display' && selectedRoot && selectedChordType) {
        const chordName = `${Note.pitchClass(selectedRoot)}${selectedChordType}`;
        const chordData = Chord.get(chordName); // Use Tonal for chord data
        if (chordData && chordData.notes) {
            title = chordName;
            notes = chordData.notes;
            formula = chordData.intervals.join(' ');
            // Calculate MIDI notes for display
            const rootOctave = Note.octave(selectedRoot) || 4;
            midiNotes = Chord.getChord(selectedChordType, `${Note.pitchClass(selectedRoot)}${rootOctave}`).notes.map(Note.midi).filter(Boolean);
        }
    }
  } catch (error) {
      console.error("Error in InfoDisplay:", error);
      title = "Error";
  }

  // Format the data for display
  const info = {
    title: title,
    formula: `Formula: ${formula || 'N/A'}`,
    notes: `Notes (MIDI): ${midiNotes?.join(', ') || 'N/A'}`,
    noteNames: `Notes: ${notes?.map(n => musicLogic.midiToNoteName(n)).join(', ') || 'N/A'}`
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