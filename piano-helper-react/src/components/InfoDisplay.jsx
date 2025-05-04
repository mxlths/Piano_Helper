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
  diatonicChordNames,
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
    } else if (currentMode === 'diatonic_chords' && selectedRoot && selectedScaleType && Array.isArray(diatonicChordNames) && diatonicChordNames.length > selectedDiatonicDegree) {
        const scaleName = `${Note.pitchClass(selectedRoot)} ${selectedScaleType}`;
        const degreeIndex = selectedDiatonicDegree;
        
        // Determine target chord name (triad or seventh)
        let targetChordName = diatonicChordNames[degreeIndex]; // Default to triad name
        if (showSevenths) {
             const seventhChords = Scale.modeChords(scaleName);
             if (Array.isArray(seventhChords) && seventhChords[degreeIndex]) {
                 targetChordName = seventhChords[degreeIndex];
             }
        }

        if (targetChordName) {
            const chordData = Chord.get(targetChordName); // Get data using just the name
            if (chordData && Array.isArray(chordData.notes)) {
                const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
                let roman = romanNumerals[degreeIndex] || '?';
                if (chordData.quality === 'Major' && roman !== 'I' && roman !== 'IV' && roman !== 'V') {
                    // Adjust case based on quality if needed, basic check
                } else if (chordData.quality === 'Minor') {
                     roman = roman.toLowerCase();
                }
                if (chordData.aliases?.includes('dim') || chordData.quality === 'Diminished') {
                     roman += '°';
                }
                if (showSevenths && !roman.includes('7')) roman += '7'; // Add 7 if showing sevenths

                title = `${roman}: ${targetChordName} (in ${scaleName})`;
                notes = chordData.notes; // Note names relative to chord root
                formula = chordData.intervals.join(' ');
                
                // Calculate MIDI notes for display based on actual root and octave
                const intervals = Scale.get(scaleName).intervals;
                const chordRootName = Note.transpose(Note.pitchClass(selectedRoot), intervals[degreeIndex]);
                const rootOctave = Note.octave(selectedRoot) || 4;
                midiNotes = Chord.getChord(targetChordName, `${chordRootName}${rootOctave}`).notes.map(Note.midi).filter(Boolean);
            }
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