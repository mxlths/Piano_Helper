import React, { useMemo } from 'react';
import MusicLogic from '../musicLogic';
import { Scale, Note, Chord } from '@tonaljs/tonal'; // Import Chord

// Instantiate the logic class once
const musicLogic = new MusicLogic();

function InfoDisplay({ 
  selectedRoot, 
  selectedScaleType, 
  selectedChordType, // For chord_search mode
  currentMode, 
  // Diatonic mode props
  diatonicChordTypes, // Renamed from diatonicChordNames
  selectedDiatonicDegree,
  showSevenths 
}) {

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
    } else if (currentMode === 'chord_search' && selectedRoot && selectedChordType) {
        const chordName = `${Note.pitchClass(selectedRoot)}${selectedChordType}`;
        const chordData = Chord.get(chordName);
        if (chordData && Array.isArray(chordData.notes)) {
            title = chordName;
            notes = chordData.notes;
            formula = chordData.intervals.join(' ');
            const rootOctave = Note.octave(selectedRoot) || 4;
            // Get notes based on the search type and root+octave
            midiNotes = Chord.getChord(selectedChordType, `${Note.pitchClass(selectedRoot)}${rootOctave}`).notes.map(Note.midi).filter(Boolean);
        }
    } else if (currentMode === 'diatonic_chords' && selectedRoot && selectedScaleType) {
        const scaleName = `${Note.pitchClass(selectedRoot)} ${selectedScaleType}`;
        const scaleInfo = Scale.get(scaleName);
        const degreeIndex = selectedDiatonicDegree;
        const rootOctave = Note.octave(selectedRoot) || 4;

        // Ensure we have intervals to calculate root
        if (!scaleInfo || !Array.isArray(scaleInfo.intervals) || scaleInfo.intervals.length <= degreeIndex) {
            throw new Error(`Invalid scale data or degree index for ${scaleName}`);
        }

        // Determine chord type (triad or seventh)
        let chordType = null;
        if (showSevenths) {
             const seventhTypes = Scale.seventhChords(scaleName);
             if (Array.isArray(seventhTypes) && seventhTypes[degreeIndex]) {
                 chordType = seventhTypes[degreeIndex];
             }
        } else {
             // Use the passed diatonicChordTypes (triads)
             if (Array.isArray(diatonicChordTypes) && diatonicChordTypes[degreeIndex]) {
                  chordType = diatonicChordTypes[degreeIndex];
             }
        }

        if (!chordType) {
             throw new Error(`Could not determine chord type for degree ${degreeIndex + 1} of ${scaleName}`);
        }
        
        // Determine the root note of this specific diatonic chord
        const chordRootName = Note.transpose(Note.pitchClass(selectedRoot), scaleInfo.intervals[degreeIndex]);
        if (!chordRootName) {
            throw new Error(`Could not determine chord root for degree ${degreeIndex + 1}`);
        }

        // Construct the full chord name (e.g., "Dm", "G7")
        const fullChordName = chordRootName + chordType;
        
        // Get data using the full chord name
        const chordData = Chord.get(fullChordName); 
        if (chordData && Array.isArray(chordData.notes) && chordData.notes.length > 0) {
            // Generate title with Roman numeral
            const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
            let roman = romanNumerals[degreeIndex] || '?';
            if (chordData.quality === 'Minor') roman = roman.toLowerCase();
            if (chordData.quality === 'Diminished') roman += '°';
            if (showSevenths && chordData.type !== 'dominant seventh' && chordData.type !== 'major seventh' && chordData.type !== 'minor seventh' && chordData.type !== 'half-diminished') {
                 // Add '7' if it's a 7th and not already implied by type (basic check)
                 // This might need refinement based on how Tonal names chords
            }
            
            title = `${roman}: ${fullChordName} (in ${scaleName})`;
            notes = chordData.notes; // Note names relative to chord root
            formula = chordData.intervals.join(' ');
            
            // Calculate MIDI notes using full name and correct root+octave
            midiNotes = Chord.getChord(fullChordName, `${chordRootName}${rootOctave}`).notes.map(Note.midi).filter(Boolean);
        } else {
            // Throw error if Chord.get failed, caught below
            throw new Error(`Could not get data for chord ${fullChordName}`); 
        }
    }
  } catch (error) {
      console.error("Error in InfoDisplay:", error);
      title = error.message || "Error processing selection"; // Show specific error
      notes = [];
      midiNotes = [];
      formula = '-'; // Reset formula on error
  }

  // Format the data for display
  const info = {
    title: title,
    formula: `Formula: ${formula || 'N/A'}`,
    notes: `Notes (MIDI): ${Array.isArray(midiNotes) ? midiNotes.join(', ') : 'N/A'}`,
    // Ensure we join the 'notes' array (pitch classes) directly, check it's an array first
    noteNames: `Notes: ${Array.isArray(notes) ? notes.join(', ') : 'N/A'}` 
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