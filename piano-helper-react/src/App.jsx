import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook
import useDrill from './hooks/useDrill.js'; // <-- Import useDrill
import { Scale, Note, Chord, ScaleType, ChordType, PcSet, Interval } from "@tonaljs/tonal"; // Import Tonal functions and Interval

console.log("Tonal PcSet object:", PcSet);
console.log("Tonal Scale object:", Scale); // <-- Add log for Scale object

// --- Constants ---
// const ROOT_NOTES = PcSet.chroma(); // TEMP: PcSet.chroma() returning '000000000000'
const ROOT_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; // <-- Hardcoded workaround
const OCTAVES = [2, 3, 4, 5];
const SCALE_TYPES = ScaleType.names();
const CHORD_TYPES = ChordType.names();
const MODES = [
  { value: 'scale_display', label: 'Scale Display' },
  { value: 'chord_search', label: 'Chord Search' },
  { value: 'diatonic_chords', label: 'Diatonic Chords' },
];
const INVERSIONS = [
  { value: 0, label: 'Root Pos' },
  { value: 1, label: '1st Inv' },
  { value: 2, label: '2nd Inv' },
  { value: 3, label: '3rd Inv' }, // Only applicable for 7ths
];

function App() {
  // --- State Management ---
  const [currentMode, setCurrentMode] = useState(MODES[0].value); // Default to 'scale_display'
  const [selectedRootNote, setSelectedRootNote] = useState('C');
  const [selectedOctave, setSelectedOctave] = useState(4);
  const [selectedScaleType, setSelectedScaleType] = useState('major');
  const [selectedChordType, setSelectedChordType] = useState('maj7');
  // Diatonic Chord Mode State
  const [selectedDiatonicDegree, setSelectedDiatonicDegree] = useState(0); // 0-6 index
  const [showSevenths, setShowSevenths] = useState(false);
  const [splitHandVoicing, setSplitHandVoicing] = useState(false);
  const [rhInversion, setRhInversion] = useState(0); // 0-3 index
  const [splitHandInterval, setSplitHandInterval] = useState(24); // New state: 12 for 1 octave, 24 for 2 octaves

  // --- MIDI Input State ---
  // REMOVED: const [activeMidiNotes, setActiveMidiNotes] = useState(new Set()); // Now handled in useMidi

  // --- Drill State ---
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillOptions, setDrillOptions] = useState({}); // User selections for the current drill
  const [currentDrillStep, setCurrentDrillStep] = useState({ expectedMidiNotes: [], type: null, stepIndex: 0, totalSteps: 0 });
  const [drillScore, setDrillScore] = useState({ correctNotes: 0, incorrectNotes: 0 });

  // --- Calculated Values (Moved Before Hooks that Depend on Them) ---
  const selectedRootWithOctave = useMemo(() => `${selectedRootNote}${selectedOctave}`, [selectedRootNote, selectedOctave]);
  const rootNoteMidi = useMemo(() => Note.midi(selectedRootWithOctave), [selectedRootWithOctave]);
  const scaleName = useMemo(() => `${selectedRootNote} ${selectedScaleType}`, [selectedRootNote, selectedScaleType]);
  const scaleInfo = useMemo(() => {
      const info = Scale.get(scaleName);
      return info;
  }, [scaleName]);

  // Get FULL diatonic triad and seventh chord names
  const diatonicTriads = useMemo(() => {
      try {
        const degrees = Scale.degrees(scaleName);
        if (typeof degrees !== 'function') return []; // Ensure degrees is a function
        const chords = [];
        for (let i = 1; i <= 7; i++) {
            const tonic = degrees(i);    // 1st degree note
            const third = degrees(i + 2);  // 3rd degree note (relative to tonic)
            const fifth = degrees(i + 4);  // 5th degree note (relative to tonic)
            if (!tonic || !third || !fifth) continue; // Skip if notes are invalid
            
            // Detect chord based on notes
            const detected = Chord.detect([tonic, third, fifth]);
            // Prefer simpler names, or just take the first
            const chordName = detected.length > 0 ? detected[0] : `${tonic}?`; // Fallback name
            chords.push(chordName);
        }
        console.log(`App.jsx - Calculated Diatonic Triads for ${scaleName}:`, chords); // Log results
        return chords.length === 7 ? chords : []; // Ensure we have 7 chords
      } catch (e) {
          console.error(`Error building triads for ${scaleName}:`, e); return [];
      }
  }, [scaleName]); // Depend only on scaleName

  const diatonicSevenths = useMemo(() => { 
     try {
        const degrees = Scale.degrees(scaleName);
        if (typeof degrees !== 'function') return [];
        const chords = [];
        for (let i = 1; i <= 7; i++) {
            const tonic = degrees(i);
            const third = degrees(i + 2);
            const fifth = degrees(i + 4);
            const seventh = degrees(i + 6); // 7th degree note (relative to tonic)
            if (!tonic || !third || !fifth || !seventh) continue;

            const detected = Chord.detect([tonic, third, fifth, seventh]);
            const chordName = detected.length > 0 ? detected[0] : `${tonic}?7`; // Fallback name
            chords.push(chordName);
        }
        console.log(`App.jsx - Calculated Diatonic Sevenths for ${scaleName}:`, chords); // Log results
        return chords.length === 7 ? chords : [];
     } catch (e) {
         console.error(`Error building 7th chords for ${scaleName}:`, e); return [];
     }
  }, [scaleName]); // Depend only on scaleName

  // --- Calculated Diatonic Chord Notes (Moved Up for Drills) ---
  const calculatedDiatonicChordNotes = useMemo(() => {
      console.log("App.jsx: Recalculating MIDI notes for all diatonic chords...");
      const octave = selectedOctave;
      const targetChords = showSevenths ? diatonicSevenths : diatonicTriads;
      const allChordNotes = [];

      if (!Array.isArray(targetChords) || targetChords.length < 7) {
          console.warn("App.jsx - Diatonic Drill Calc - Waiting for valid base chords.");
          return []; // Return empty if base chords aren't ready
      }

      for (let degree = 0; degree < 7; degree++) {
          let currentDegreeChordNotes = []; // MIDI notes for this specific degree
          const fullChordName = targetChords[degree];
          if (!fullChordName) continue; // Skip if name invalid

          try {
              const chordDataForRoot = Chord.get(fullChordName);
              if (chordDataForRoot.empty) continue;
              const chordRootName = chordDataForRoot.tonic;
              const chordRootWithOctave = `${chordRootName}${octave}`;
              const chordRootMidi = Note.midi(chordRootWithOctave);
              if (!chordRootMidi) continue;

              const chordTypeAlias = chordDataForRoot.aliases?.[0];
              if (!chordTypeAlias) continue;

              const chordData = Chord.getChord(chordTypeAlias, chordRootWithOctave);
              if (!chordData || !Array.isArray(chordData.notes) || chordData.notes.length === 0) continue;

              let chordNotes = chordData.notes; // Note names with correct octave

              // Apply RH Inversion (same logic as notesToHighlight)
              if (rhInversion > 0 && rhInversion < chordNotes.length) {
                  const inversionSlice = chordNotes.slice(0, rhInversion);
                  const remainingSlice = chordNotes.slice(rhInversion);
                  const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P'));
                  chordNotes = [...remainingSlice, ...invertedNotes];
              }

              let midiNotes = chordNotes.map(Note.midi).filter(Boolean);
              if (midiNotes.length === 0) continue;

              // Apply Split Hand Voicing (same logic as notesToHighlight)
              if (splitHandVoicing) {
                  const chordRootMidiValue = Note.midi(chordRootWithOctave);
                  if (chordRootMidiValue !== null && chordRootMidiValue >= splitHandInterval) {
                      const actualLhNote = chordRootMidiValue - splitHandInterval;
                      currentDegreeChordNotes = [actualLhNote, ...midiNotes];
                  } else {
                      currentDegreeChordNotes = midiNotes; // Fallback if split fails
                  }
              } else {
                  currentDegreeChordNotes = midiNotes;
              }
              
              // Filter just in case & ensure sort order for comparison later?
               currentDegreeChordNotes = currentDegreeChordNotes.filter(n => n !== null && n >= 0 && n <= 127).sort((a,b)=> a-b);

          } catch (error) {
              console.error(`Error calculating notes for degree ${degree} (${fullChordName}):`, error);
              currentDegreeChordNotes = []; // Reset on error for this degree
          }
          
          allChordNotes.push(currentDegreeChordNotes); 
      }

      console.log("App.jsx: Finished calculating MIDI notes for diatonic chords:", allChordNotes);
      return allChordNotes; // Should be array of 7 arrays (some might be empty if errors occurred)

  }, [
      selectedOctave, showSevenths, diatonicTriads, diatonicSevenths, // Base chords
      rhInversion, splitHandVoicing, splitHandInterval // Modifiers
  ]);

  // --- Instantiate Hooks ---

  // ** Call useMidi FIRST to get latestNoteOn/Off **
  const {
    isInitialized: isMidiInitialized,
    inputs: midiInputs,
    outputs: midiOutputs,
    selectedInputId,
    selectedOutputId,
    logMessages: midiLogMessages,
    selectInput: selectMidiInput,
    selectOutput: selectMidiOutput,
    sendMessage: sendMidiMessage,
    latestNoteOn, // <-- Get latest Note On event (for drill trigger)
    activeNotes // <-- Get managed active notes directly
  } = useMidi(); // <-- No callbacks passed

  // Log activeNotes on every render of App
  console.log("App.jsx render - activeNotes:", activeNotes);

  // ** Instantiate useDrill AFTER useMidi **
  const {
      currentDrillStep: drillStepData, // Rename to avoid conflict
      drillScore: currentDrillScore, // Rename
      notesPlayedThisStep, // Keep this? Or remove if unused?
      // processMidiInput // No longer needed/returned from useDrill
  } = useDrill({
      isDrillActive,
      currentMode,
      drillOptions,
      scaleName,
      selectedChordType,
      diatonicTriads,
      diatonicSevenths,
      selectedOctave,
      showSevenths,
      splitHandVoicing,
      splitHandInterval,
      rhInversion,
      playedNoteEvent: latestNoteOn, // <-- Pass latestNoteOn event here
      calculatedDiatonicChordNotes, // <-- Pass pre-calculated chord notes
      selectedRootNote, // <-- Add missing prop
      ROOT_NOTES // <-- Pass the ROOT_NOTES constant
  });

  // Metronome state and functions
  const {
    isPlaying: isMetronomePlaying,
    bpm: metronomeBpm,
    selectedSoundNote: metronomeSoundNote,
    availableSounds: metronomeSounds,
    timeSignature: metronomeTimeSignature,
    togglePlay: toggleMetronomePlay,
    changeTempo: changeMetronomeTempo,
    changeSound: changeMetronomeSound,
    changeTimeSignature: changeMetronomeTimeSignature,
  } = useMetronome(sendMidiMessage); // Pass the sendMessage function

  // --- Calculated Values ---
  const notesToHighlight = useMemo(() => {
    let calculatedNotes = [];
    const octave = selectedOctave;
    const rootName = selectedRootNote;

    try {
      if (currentMode === 'scale_display' && selectedScaleType) {
        const scaleData = Scale.get(scaleName); // Use calculated scaleName
        if (scaleData && Array.isArray(scaleData.notes)) {
          const notesInOctave = scaleData.notes.map(noteName => Note.midi(`${noteName}${octave}`)).filter(Boolean);
          const notesInNextOctave = scaleData.notes.map(noteName => Note.midi(`${noteName}${octave + 1}`)).filter(Boolean);
          calculatedNotes = [...notesInOctave, ...notesInNextOctave];
        }
      } else if (currentMode === 'chord_search' && selectedChordType) {
         if (!rootNoteMidi) return [];
         const chordData = Chord.getChord(selectedChordType, `${rootName}${octave}`); // Use getChord for root+octave
         if (chordData && Array.isArray(chordData.notes)) {
           calculatedNotes = chordData.notes.map(Note.midi).filter(Boolean);
         }
      } else if (currentMode === 'diatonic_chords') {
        const targetChords = showSevenths ? diatonicSevenths : diatonicTriads;
        
        // --- MODIFICATION START ---
        // Ensure targetChords is a valid array with at least 7 elements 
        // AND the degree is within bounds before proceeding.
        if (!Array.isArray(targetChords) || targetChords.length < 7 || selectedDiatonicDegree < 0 || selectedDiatonicDegree >= targetChords.length) { 
            console.warn(`App.jsx - Diatonic Mode - Waiting for valid chords or valid degree. Chords length: ${Array.isArray(targetChords) ? targetChords.length : 'N/A'}, Degree: ${selectedDiatonicDegree}`);
            return []; // Return empty if chords aren't ready or degree is invalid
        }
        // --- MODIFICATION END ---

        const fullChordName = targetChords[selectedDiatonicDegree];
        if (!fullChordName) {
            console.warn(`No valid chord name found for degree ${selectedDiatonicDegree}`); return [];
        }

        // We need the root of *this* chord to calculate the correct octave start
        const chordDataForRoot = Chord.get(fullChordName); // Get data just to find the root
        if (chordDataForRoot.empty) {
             console.warn(`Could not parse chord ${fullChordName} to find root`); return [];
        }
        const chordRootName = chordDataForRoot.tonic;
        const chordRootWithOctave = `${chordRootName}${octave}`;
        const chordRootMidi = Note.midi(chordRootWithOctave);
        if (!chordRootMidi) { console.warn(`Invalid MIDI for ${chordRootWithOctave}`); return []; }

        console.log(`App.jsx - Diatonic Mode - Attempting chord: ${fullChordName} starting near ${chordRootWithOctave}`);

        // --- MODIFICATION START ---
        // Get the chord TYPE alias (e.g., 'M', 'm', 'm7', 'm7b5', 'dim')
        // Chord.getChord needs the TYPE alias, not the full symbol like 'CM' or 'Dm7'.
        const chordTypeAlias = chordDataForRoot.aliases?.[0]; // Get the primary alias
        if (!chordTypeAlias) {
             console.warn(`App.jsx - Diatonic Mode - Could not determine chord type alias for ${fullChordName}. ChordData:`, chordDataForRoot);
             return [];
        }

        const chordData = Chord.getChord(chordTypeAlias, chordRootWithOctave); 
        console.log(`App.jsx - Diatonic Mode - Chord.getChord result for type alias '${chordTypeAlias}' and root '${chordRootWithOctave}':`, chordData);
        // --- MODIFICATION END ---
        
        if (!chordData || !Array.isArray(chordData.notes) || chordData.notes.length === 0) {
             console.warn(`App.jsx - Diatonic Mode - Failed to get valid notes for ${fullChordName} using type ${chordTypeAlias}`);
             return []; // Return empty array if chord notes invalid
         }

        let chordNotes = chordData.notes; // Note names with correct octave
        console.log(`App.jsx - Diatonic Mode - Initial Chord Notes:`, chordNotes);

        // Apply RH Inversion
        if (rhInversion > 0 && rhInversion < chordNotes.length) {
            // Simple cyclic permutation for inversion
            const inversionSlice = chordNotes.slice(0, rhInversion);
            const remainingSlice = chordNotes.slice(rhInversion);
            // Transpose the moved notes up an octave
            const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P')); 
            chordNotes = [...remainingSlice, ...invertedNotes];
             console.log(`App.jsx - Diatonic Mode - Notes after Inversion:`, chordNotes);
        }
        
        let midiNotes = chordNotes.map(Note.midi).filter(Boolean);
         console.log(`App.jsx - Diatonic Mode - Calculated MIDI notes:`, midiNotes);
        if (midiNotes.length === 0) {
             console.warn(`App.jsx - Diatonic Mode - No valid MIDI notes for ${fullChordName}`);
             return []; 
        }

        // Apply Split Hand Voicing
        if (splitHandVoicing) {
          const chordRootMidiValue = Note.midi(chordRootWithOctave); 

          if (chordRootMidiValue !== null && chordRootMidiValue >= splitHandInterval) { // Check if root MIDI is valid and high enough for the interval
              const actualLhNote = chordRootMidiValue - splitHandInterval; // Use state variable
              calculatedNotes = [actualLhNote, ...midiNotes]; 
          } else {
              console.warn(`Could not calculate valid LH note for split voicing (root MIDI: ${chordRootMidiValue}, interval: ${splitHandInterval}).`);
              calculatedNotes = midiNotes; 
          }
        } else {
          calculatedNotes = midiNotes;
        }
         console.log(`App.jsx - Diatonic Mode - Final calculatedNotes before filter:`, calculatedNotes);

      }
    } catch (error) {
      console.error("Error calculating notes:", error);
      calculatedNotes = []; // Return empty array on error
    }

    // Filter final notes
    // console.log('App.jsx - notesToHighlight before filter:', calculatedNotes);
    return calculatedNotes.filter(n => n !== null && n >= 0 && n <= 127);

  }, [currentMode, selectedRootNote, selectedOctave, selectedScaleType, selectedChordType, rootNoteMidi, scaleName, diatonicTriads, diatonicSevenths, selectedDiatonicDegree, showSevenths, splitHandVoicing, rhInversion, splitHandInterval]);

  // --- Event Handlers ---
  const handleModeChange = (newMode) => {
    if (MODES.find(m => m.value === newMode)) {
        setCurrentMode(newMode);
    }
  };

  const handleRootChange = (newRoot) => {
    if (ROOT_NOTES.includes(newRoot)) {
      setSelectedRootNote(newRoot);
    }
  };

  const handleOctaveChange = (newOctave) => {
    const octaveNum = parseInt(newOctave, 10);
    if (OCTAVES.includes(octaveNum)) {
      setSelectedOctave(octaveNum);
    }
  };

  const handleScaleChange = (newScale) => {
    if (SCALE_TYPES.includes(newScale)) {
      setSelectedScaleType(newScale);
      setCurrentMode('scale_display');
      // Reset diatonic degree when scale changes
      setSelectedDiatonicDegree(0);
    }
  };

   const handleChordChange = (newChord) => {
    if (CHORD_TYPES.includes(newChord)) {
      setSelectedChordType(newChord);
      setCurrentMode('chord_search');
    }
  };

  // New Handlers
  const handleDiatonicDegreeChange = (index) => {
      setSelectedDiatonicDegree(index);
      // Ensure mode is set correctly if interacting with degree buttons
      if (currentMode !== 'diatonic_chords') {
          setCurrentMode('diatonic_chords');
      }
  };
  const handleShowSeventhsChange = (event) => {
      setShowSevenths(event.target.checked);
      // Reset inversion if switching from 7ths (3rd inv) to triads
      if (!event.target.checked && rhInversion === 3) {
          setRhInversion(0);
      }
  };
  const handleSplitHandVoicingChange = (event) => {
      setSplitHandVoicing(event.target.checked);
  };
  const handleRhInversionChange = (newInversionValue) => {
      const invIndex = parseInt(newInversionValue, 10);
       // Prevent selecting 3rd inversion if not showing sevenths
      if (!showSevenths && invIndex === 3) return; 
      if (INVERSIONS.find(inv => inv.value === invIndex)) {
          setRhInversion(invIndex);
      }
  };

  // New handler for split hand interval
  const handleSplitHandIntervalChange = (event) => {
    const intervalValue = parseInt(event.target.value, 10);
    if (intervalValue === 12 || intervalValue === 24) {
      setSplitHandInterval(intervalValue);
    }
  };

  const handleDrillToggle = () => {
    setIsDrillActive(!isDrillActive);
  };

  console.log('App.jsx - ROOT_NOTES:', ROOT_NOTES);
  // console.log('App.jsx - Notes to Highlight:', notesToHighlight);

  return (
    <div className="App">
      <h1>Piano Helper (React Version)</h1>

      <Controls
        // Mode
        modes={MODES}
        currentMode={currentMode}
        onModeChange={handleModeChange}

        // Root/Scale/Chord Search Props
        rootNotes={ROOT_NOTES}
        octaves={OCTAVES}
        scaleTypes={SCALE_TYPES}
        chordTypes={CHORD_TYPES} // For chord_search mode
        selectedRootNote={selectedRootNote}
        selectedOctave={selectedOctave}
        selectedScaleType={selectedScaleType}
        selectedChordType={selectedChordType} // For chord_search mode
        onRootChange={handleRootChange}
        onOctaveChange={handleOctaveChange}
        onScaleChange={handleScaleChange}
        onChordChange={handleChordChange} // For chord_search mode

        // Diatonic Chord Mode Props - CORRECTED
        diatonicTriads={diatonicTriads} // Pass the calculated triads
        diatonicSevenths={diatonicSevenths} // Pass the calculated sevenths
        selectedDiatonicDegree={selectedDiatonicDegree}
        showSevenths={showSevenths}
        splitHandVoicing={splitHandVoicing}
        rhInversion={rhInversion}
        inversions={INVERSIONS} 
        onDiatonicDegreeChange={handleDiatonicDegreeChange}
        onShowSeventhsChange={handleShowSeventhsChange}
        onSplitHandVoicingChange={handleSplitHandVoicingChange}
        onRhInversionChange={handleRhInversionChange}
        splitHandInterval={splitHandInterval}
        onSplitHandIntervalChange={handleSplitHandIntervalChange}

        // MIDI Props
        midiInputs={midiInputs}
        midiOutputs={midiOutputs}
        selectedInputId={selectedInputId}
        selectedOutputId={selectedOutputId}
        onSelectInput={selectMidiInput}
        onSelectOutput={selectMidiOutput}
        isMidiInitialized={isMidiInitialized}

        // Metronome Props
        isMetronomePlaying={isMetronomePlaying}
        metronomeBpm={metronomeBpm}
        metronomeSoundNote={metronomeSoundNote}
        metronomeSounds={metronomeSounds}
        metronomeTimeSignature={metronomeTimeSignature}
        onToggleMetronome={toggleMetronomePlay}
        onChangeMetronomeTempo={changeMetronomeTempo}
        onChangeMetronomeSound={changeMetronomeSound}
        onChangeMetronomeTimeSignature={changeMetronomeTimeSignature}

        // --- Drill Props ---
        isDrillActive={isDrillActive}
        setIsDrillActive={handleDrillToggle}
        drillOptions={drillOptions}
        setDrillOptions={setDrillOptions}
        currentDrillStep={drillStepData}
        drillScore={currentDrillScore}
      />
      <PianoKeyboard
        rootNote={rootNoteMidi}
        notesToHighlight={notesToHighlight}
        octaveRange={OCTAVES}
        playedNotes={activeNotes} // <-- Pass activeNotes from useMidi directly
        expectedNotes={isDrillActive ? drillStepData.expectedMidiNotes : []} // <-- Pass expected notes
        lowestNote={48} // Example: C3
      />
      <InfoDisplay
        selectedRoot={selectedRootWithOctave}
        selectedScaleType={selectedScaleType}
        selectedChordType={selectedChordType}
        currentMode={currentMode}
        diatonicTriads={diatonicTriads}
        diatonicSevenths={diatonicSevenths}
        selectedDiatonicDegree={selectedDiatonicDegree}
        showSevenths={showSevenths}
      />
      <MidiMonitorDisplay
        logMessages={midiLogMessages}
      />

    </div>
  );
}

export default App; 