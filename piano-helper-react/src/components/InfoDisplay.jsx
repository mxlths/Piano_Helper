import React, { useMemo } from 'react';
import MusicLogic from '../musicLogic';

// Instantiate the logic class once
const musicLogic = new MusicLogic();

function InfoDisplay({ selectedRoot, selectedScaleType, currentMode /* TODO: Add chord props later */ }) {

  // Calculate scale/chord data only when relevant props change
  const displayData = useMemo(() => {
    if (currentMode === 'scale_display' && selectedRoot && selectedScaleType) {
      return musicLogic.getScale(selectedRoot, selectedScaleType);
    } else if (currentMode === 'chord_display' /* && selectedRoot && selectedChordType */) {
      // TODO: Add chord calculation logic later
      // return musicLogic.getChord(selectedRoot, selectedChordType);
      return { name: 'Chord Display (TBD)', notes: [], formula: 'TBD' };
    } else {
      return null; // No valid mode/selection
    }
  }, [currentMode, selectedRoot, selectedScaleType /*, selectedChordType */]);

  // Format the data for display
  const info = displayData ? {
    title: displayData.name || 'N/A',
    formula: `Formula: ${displayData.formula || 'N/A'}`,
    notes: `Notes (MIDI): ${displayData.notes?.join(', ') || 'N/A'}`,
    noteNames: `Notes: ${displayData.notes?.map(n => musicLogic.midiToNoteName(n)).join(', ') || 'N/A'}`
  } : {
    title: 'Select...',
    formula: '',
    notes: '',
    noteNames: ''
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