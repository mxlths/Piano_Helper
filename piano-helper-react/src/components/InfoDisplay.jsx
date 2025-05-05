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
  diatonicTriads = [], // Add default
  diatonicSevenths = [], // Add default
  selectedDiatonicDegree,
  showSevenths,
  // Chord Progression mode props <-- NEW
  selectedProgression = null,
  transposedProgressionChords = []
}) {

  let title = '-';
  let notes = []; // Initialize as array - Represents pitch classes or MIDI notes depending on context below
  let noteNames = '-'; // <-- Declare noteNames
  let formula = '-';
  let midiNotes = []; // Initialize as array

  try {
    if (currentMode === 'scale_display' && selectedRoot && selectedScaleType) {
      const scaleName = `${Note.pitchClass(selectedRoot)} ${selectedScaleType}`;
      const scaleData = Scale.get(scaleName);
      // Ensure notes property exists and is an array
      if (scaleData && Array.isArray(scaleData.notes)) { 
        title = scaleData.name || scaleName;
        notes = scaleData.notes; // Raw pitch classes
        noteNames = notes.join(', '); // String for display
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
            notes = chordData.notes; // Raw pitch classes
            noteNames = notes.join(', '); // String for display
            formula = chordData.intervals.join(' ');
            const rootOctave = Note.octave(selectedRoot) || 4;
            // Get notes based on the search type and root+octave
            midiNotes = Chord.getChord(selectedChordType, `${Note.pitchClass(selectedRoot)}${rootOctave}`).notes.map(Note.midi).filter(Boolean);
        }
    } else if (currentMode === 'diatonic_chords' && selectedRoot && selectedScaleType) {
        console.log('InfoDisplay.jsx - Diatonic mode, received degree:', selectedDiatonicDegree);
        const scaleName = `${Note.pitchClass(selectedRoot)} ${selectedScaleType}`;
        // Determine which chord list to use
        const targetChords = showSevenths ? diatonicSevenths : diatonicTriads;

        // Ensure targetChords is valid AND the degree is within bounds
        // Also check if the chord name itself is valid at that index
        if (!Array.isArray(targetChords) || 
            targetChords.length < 7 || // Expect 7 diatonic chords usually
            selectedDiatonicDegree < 0 || 
            selectedDiatonicDegree >= targetChords.length || 
            !targetChords[selectedDiatonicDegree]) { // Check if the specific chord name exists
            
            console.warn(`InfoDisplay.jsx - Invalid/incomplete chord list (${Array.isArray(targetChords) ? targetChords.length : 'N/A'} items) or degree index (${selectedDiatonicDegree}) for ${scaleName}`);
            // Don't throw an error, just display minimal info or a loading state
            title = `Loading chords for ${scaleName}...`;
            notes = [];
            formula = '-';
            midiNotes = [];
            noteNames = '-'; // Ensure noteNames is reset
            // Skip the rest of the chord processing for this render cycle
        } else {
            // --- ORIGINAL LOGIC MOVED INSIDE ELSE BLOCK ---
            const fullChordName = targetChords[selectedDiatonicDegree];
            
            // Get data using the full chord name
            console.log('InfoDisplay - targetChordName before Chord.get:', fullChordName); // Keep this log
            const chordData = Chord.get(fullChordName); 
            if (chordData && Array.isArray(chordData.notes) && chordData.notes.length > 0) {
                // Generate title with Roman numeral
                const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
                let roman = romanNumerals[selectedDiatonicDegree] || '?';
                if (chordData.quality === 'Minor') roman = roman.toLowerCase();
                if (chordData.quality === 'Diminished') roman += '°';
                if (showSevenths && chordData.type !== 'dominant seventh' && chordData.type !== 'major seventh' && chordData.type !== 'minor seventh' && chordData.type !== 'half-diminished') {
                     // Add '7' if it's a 7th and not already implied by type (basic check)
                     // This might need refinement based on how Tonal names chords
                }
                
                title = `${roman}: ${fullChordName} (in ${scaleName})`;
                notes = chordData.notes; // Note names relative to chord root
                formula = chordData.intervals.join(' ');
                noteNames = notes.join(', '); // String for display
                
                // Calculate MIDI notes using full name and correct root+octave
                const chordRootName = chordData.tonic;
                const rootOctave = Note.octave(selectedRoot) || 4;
                if (chordRootName) { // Ensure we have a root before calculating MIDI
                    // --- MODIFICATION START ---
                    // Use the TYPE ALIAS for Chord.getChord, not the full name
                    const chordTypeAlias = chordData.aliases?.[0]; 
                    if (!chordTypeAlias) {
                        console.warn(`InfoDisplay.jsx - Could not determine chord type alias for ${fullChordName}`);
                        midiNotes = [];
                    } else {
                        const chordNotesResult = Chord.getChord(chordTypeAlias, `${chordRootName}${rootOctave}`);
                        if (chordNotesResult && Array.isArray(chordNotesResult.notes)) {
                             midiNotes = chordNotesResult.notes.map(Note.midi).filter(Boolean);
                        } else {
                             console.warn(`InfoDisplay.jsx - Chord.getChord failed for type ${chordTypeAlias} and root ${chordRootName}${rootOctave}`);
                             midiNotes = [];
                        }
                    }
                    // --- MODIFICATION END ---
                } else {
                     console.warn(`Could not get tonic for ${fullChordName} to calculate MIDI notes.`);
                     midiNotes = [];
                }
            } else {
                // Instead of throwing, maybe just show an error message in the title
                console.warn(`Could not get data for chord ${fullChordName}`);
                title = `Error: Could not get data for ${fullChordName}`;
                notes = [];
                formula = '-';
                midiNotes = [];
                noteNames = '-'; // Ensure noteNames is reset
                // throw new Error(`Could not get data for chord ${fullChordName}`); 
            }
            // --- END OF MOVED BLOCK ---
        }
    } else if (currentMode === 'chord_progression') {
        if (selectedProgression && transposedProgressionChords.length > 0) {
            title = `Progression: ${selectedProgression.name || 'Selected Progression'}`;
            // Display Roman numerals and chord names
            const romanNumeralsString = transposedProgressionChords.map(c => c.roman || '?').join(' - ');
            const chordNamesString = transposedProgressionChords.map(c => c.name || '?').join(' - ');
            noteNames = `Chords: ${chordNamesString}`;
            formula = `Roman: ${romanNumeralsString}`; 
            // Display MIDI notes of the first chord for now?
            const firstChordNotes = transposedProgressionChords[0]?.midiNotes || [];
            midiNotes = firstChordNotes; // Use midiNotes array for consistency
            notes = firstChordNotes; // Assign MIDI notes to 'notes' too for the display string below? Or keep separate? Let's assign for now.
        } else {
            title = 'Loading Progression...';
            noteNames = '-';
            formula = '-';
            notes = '-';
            midiNotes = [];
        }
    }
  } catch (error) {
      console.error("Error in InfoDisplay:", error);
      title = error.message || "Error processing selection"; // Show specific error
      notes = [];
      midiNotes = [];
      formula = '-'; // Reset formula on error
      noteNames = '-'; // Ensure noteNames is reset
  }

  // Format the data for display
  const info = {
    title: title,
    formula: `Formula: ${formula || 'N/A'}`,
    noteNames: `Notes: ${noteNames}`, // Use the prepared noteNames string
    midiNotesDisplay: `MIDI: ${Array.isArray(midiNotes) ? midiNotes.join(', ') : 'N/A'}` // Use midiNotes for MIDI display
  };

  return (
    <div style={{ border: '1px solid orange', padding: '10px', margin: '10px 0' }}>
      <h2>Info Display</h2>
      <h3>{info.title}</h3>
      <p>{info.noteNames}</p>
      <p>{info.formula}</p>
      <p><small>{info.midiNotesDisplay}</small></p>
    </div>
  );
}

export default InfoDisplay; 