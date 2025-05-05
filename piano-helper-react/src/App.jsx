import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook
import useDrill from './hooks/useDrill.js'; // <-- Import useDrill
import useMidiPlayer from './hooks/useMidiPlayer.js'; // <-- Import MIDI Player hook
import DrillControls from './components/DrillControls'; // <-- Import DrillControls
import { Scale, Note, Chord, ScaleType, ChordType, PcSet, Interval } from "@tonaljs/tonal"; // Import Tonal functions and Interval

// console.log("Tonal PcSet object:", PcSet);
// console.log("Tonal Scale object:", Scale); // <-- Add log for Scale object

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
  // *** Add Render Counter ***
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
    console.log(`App.jsx Render Count: ${renderCount.current}`);
  }); // No dependency array, runs on every render

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

  // --- MIDI Input State (Managed in App.jsx now) ---
  const [latestMidiEvent, setLatestMidiEvent] = useState(null); 
  const [activeNotes, setActiveNotes] = useState(new Set());
  // Memoized array version for props that need it (like PianoKeyboard)
  const activeNotesArray = useMemo(() => Array.from(activeNotes), [activeNotes]);

  // --- Drill State ---
  const [isDrillActive, setIsDrillActive] = useState(false);
  // User configurable drill options (set before starting)
  const [drillNumOctaves, setDrillNumOctaves] = useState(1); // New state for octave range
  const [drillRepetitions, setDrillRepetitions] = useState(1); // New state for repetitions
  const [drillStyle, setDrillStyle] = useState('ascending'); // New state for drill order style
  // Options passed to the active drill instance
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
        // console.log(`App.jsx - Calculated Diatonic Triads for ${scaleName}:`, chords); // Log results
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
        // console.log(`App.jsx - Calculated Diatonic Sevenths for ${scaleName}:`, chords); // Log results
        return chords.length === 7 ? chords : [];
     } catch (e) {
         console.error(`Error building 7th chords for ${scaleName}:`, e); return [];
     }
  }, [scaleName]); // Depend only on scaleName

  // --- Calculated Diatonic Chord Notes (Moved Up for Drills) ---
  const calculatedDiatonicChordNotes = useMemo(() => {
      console.log("App.jsx: Recalculating calculatedDiatonicChordNotes...");
      const rootWithOctave = `${selectedRootNote}${selectedOctave}`;
      const scaleInfo = Scale.get(scaleName);
      const targetChords = showSevenths ? diatonicSevenths : diatonicTriads;
      const allChordNotes = [];

      if (scaleInfo.empty || !Array.isArray(scaleInfo.intervals) || scaleInfo.intervals.length < 7) {
          console.warn("App.jsx - Diatonic Drill Calc - Returning [] due to invalid scale intervals.", { scaleName: scaleName, scaleInfoEmpty: scaleInfo.empty, scaleIntervals: scaleInfo.intervals });
          return [];
      }
      if (!Array.isArray(targetChords) || targetChords.length < 7) {
          console.warn("App.jsx - Diatonic Drill Calc - Returning [] due to invalid base chord names.", { showSevenths: showSevenths, diatonicTriadsLength: diatonicTriads?.length, diatonicSeventhsLength: diatonicSevenths?.length, targetChordsLength: targetChords?.length });
          return []; // Return empty if base chords aren't ready
      }

      const scaleIntervals = scaleInfo.intervals;

      for (let degree = 0; degree < 7; degree++) {
          let currentDegreeChordNotes = []; // MIDI notes for this specific degree
          const fullChordName = targetChords[degree]; // e.g., "Cm"
          const interval = scaleIntervals[degree]; // e.g., "5P"
          
          if (!fullChordName || !interval) continue; // Skip if name or interval invalid

          try {
              // 1. Determine the correct root note with octave based on scale intervals
              const correctChordRoot = Note.transpose(rootWithOctave, interval); 
              if (!correctChordRoot || Note.midi(correctChordRoot) === null) {
                 console.warn(`App.jsx - Diatonic Drill Calc - Invalid root ${correctChordRoot} for degree ${degree+1}`);
                 continue;
              }
              const correctChordRootMidi = Note.midi(correctChordRoot); // Needed for split hand calc

              // 2. Get the chord type alias from the full name (e.g., "m" from "Cm")
              const chordDataForType = Chord.get(fullChordName);
              if (chordDataForType.empty) {
                  console.warn(`App.jsx - Diatonic Drill Calc - Could not parse chord ${fullChordName} to get type.`);
                  continue;
              }
              const chordTypeAlias = chordDataForType.aliases?.[0];
              if (!chordTypeAlias) {
                  console.warn(`App.jsx - Diatonic Drill Calc - Could not get type alias for ${fullChordName}.`);
                  continue;
              }

              // 3. Get chord notes using the correct type AND the correct root+octave
              const chordData = Chord.getChord(chordTypeAlias, correctChordRoot);
              if (chordData.empty || !Array.isArray(chordData.notes) || chordData.notes.length === 0) {
                 console.warn(`App.jsx - Diatonic Drill Calc - Failed to get notes for ${chordTypeAlias} at ${correctChordRoot}.`);
                 continue;
              }

              let chordNotes = chordData.notes; // Note names with correct octave

              // 4. Apply RH Inversion (operates on note names, should be fine)
              if (rhInversion > 0 && rhInversion < chordNotes.length) {
                  const inversionSlice = chordNotes.slice(0, rhInversion);
                  const remainingSlice = chordNotes.slice(rhInversion);
                  const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P'));
                  chordNotes = [...remainingSlice, ...invertedNotes];
              }

              // 5. Convert to MIDI
              let midiNotes = chordNotes.map(Note.midi).filter(Boolean);
              if (midiNotes.length === 0) continue;

              // 6. Apply Split Hand Voicing (using correctChordRootMidi)
              if (splitHandVoicing) {
                  // Use the MIDI value of the *correctly calculated* chord root 
                  if (correctChordRootMidi !== null && correctChordRootMidi >= splitHandInterval) {
                      const actualLhNote = correctChordRootMidi - splitHandInterval;
                      currentDegreeChordNotes = [actualLhNote, ...midiNotes];
                  } else {
                      currentDegreeChordNotes = midiNotes; // Fallback if split fails
                  }
              } else {
                  currentDegreeChordNotes = midiNotes;
              }
              
              // Filter & sort MIDI notes
               currentDegreeChordNotes = currentDegreeChordNotes.filter(n => n !== null && n >= 0 && n <= 127).sort((a,b)=> a-b);

          } catch (error) {
              console.error(`Error calculating notes for degree ${degree} (${fullChordName}):`, error);
              currentDegreeChordNotes = []; // Reset on error for this degree
          }
          
          allChordNotes.push(currentDegreeChordNotes); 
      }

      console.log("App.jsx: Finished calculating MIDI notes for diatonic chords. Returning valid array.");
      return allChordNotes; // Should be array of 7 arrays (some might be empty if errors occurred)

  }, [
      scaleName, selectedOctave, selectedRootNote, // <-- Need scale info for intervals/root
      showSevenths, diatonicTriads, diatonicSevenths, // Base chords
      rhInversion, splitHandVoicing, splitHandInterval // Modifiers
  ]);

  // --- MIDI Callback Handlers (Defined in App.jsx) ---
  const handleNoteOn = useCallback((event) => {
    setLatestMidiEvent(event); // Update the latest event state
    setActiveNotes(prev => new Set(prev).add(event.note)); // Add note to active set
  }, []); // No dependencies needed, updates state within App

  const handleNoteOff = useCallback((event) => {
    setLatestMidiEvent(event); // Update the latest event state (even for note off)
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(event.note); // Remove note from active set
      return next;
    });
  }, []); // No dependencies needed

  // --- Instantiate Hooks ---

  // ** Call useMidi FIRST and pass callbacks **
  const {
    isInitialized: isMidiInitialized,
    inputs: midiInputs,
    outputs: midiOutputs,
    selectedInputId,
    selectedOutputId,
    logMessages: midiLogMessages,
    selectInput: selectMidiInput,
    selectOutput: selectMidiOutput,
    sendMessage: sendMidiMessage, // <-- Get sendMessage
  } = useMidi({ 
      onNoteOn: handleNoteOn, 
      onNoteOff: handleNoteOff 
  }); // <-- Pass callbacks

  // ** Instantiate useMidiPlayer AFTER useMidi **
  const {
      playbackState,
      loadedFileName,
      loadMidiFile,
      play: playMidiFile,
      pause: pauseMidiFile,
      stop: stopMidiFile,
  } = useMidiPlayer(sendMidiMessage); // <-- Pass sendMessage

  // ** Instantiate useDrill AFTER useMidi **
  const {
    currentDrillStep: drillStepData, // Renamed for clarity
    drillScore: currentDrillScore
  } = useDrill({
    isDrillActive,
    currentMode,
    drillOptions, // Pass the combined options object
    scaleName,
    selectedChordType,
    diatonicTriads, 
    diatonicSevenths, 
    selectedOctave, 
    showSevenths, 
    splitHandVoicing, 
    splitHandInterval, 
    rhInversion, 
    playedNoteEvent: latestMidiEvent, // Pass the state variable from App.jsx
    calculatedDiatonicChordNotes, 
    selectedRootNote, 
    ROOT_NOTES
  });

  // ** Instantiate useMetronome AFTER useMidi **
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
        // --- REVISED LOGIC --- 
        // Use the pre-calculated notes from calculatedDiatonicChordNotes hook
        if (Array.isArray(calculatedDiatonicChordNotes) && 
            selectedDiatonicDegree >= 0 && 
            selectedDiatonicDegree < calculatedDiatonicChordNotes.length) {
            
            calculatedNotes = calculatedDiatonicChordNotes[selectedDiatonicDegree] || []; 
            // console.log(`App.jsx - Diatonic Highlight - Using pre-calculated notes for degree ${selectedDiatonicDegree}:`, calculatedNotes);
        } else {
            console.warn(`App.jsx - Diatonic Highlight - Pre-calculated notes not available or degree invalid.`);
            calculatedNotes = [];
        }
      }
    } catch (error) {
      console.error("Error calculating notes:", error);
      calculatedNotes = []; // Return empty array on error
    }

    // Filter final notes
    // console.log('App.jsx - notesToHighlight before filter:', calculatedNotes);
    return calculatedNotes.filter(n => n !== null && n >= 0 && n <= 127);

  }, [
      currentMode, 
      // Scale Display deps:
      scaleName, selectedOctave,
      // Chord Search deps:
      selectedChordType, selectedRootNote, // Keep octave here too for chord root
      // Diatonic Chords deps:
      selectedDiatonicDegree, 
      calculatedDiatonicChordNotes // <-- Add dependency 
      // Removed other diatonic deps like showSevenths, rhInversion etc. as they are handled in calculatedDiatonicChordNotes
  ]);

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

  // New handlers for drill options
  const handleDrillOctavesChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (value >= 1 && value <= 4) { // Limit octaves, e.g., 1-4
        setDrillNumOctaves(value);
    }
  };

  const handleDrillRepetitionsChange = (event) => {
     const value = parseInt(event.target.value, 10);
     if (value >= 1 && value <= 10) { // Limit repetitions, e.g., 1-10
        setDrillRepetitions(value);
     }
  };

  // New handler for drill style
  const handleDrillStyleChange = (event) => {
    const newStyle = event.target.value;
    // Add validation if needed, e.g., ensure it's one of the expected values
    setDrillStyle(newStyle);
  };

  const handleDrillToggle = () => {
    const startingDrill = !isDrillActive;
    if (startingDrill) {
        // Set the options for the drill instance when starting
        setDrillOptions({
            octaves: drillNumOctaves, // Pass the range setting
            repetitions: drillRepetitions,
            style: drillStyle // Pass the selected style
        });
    } else {
        // Reset options or leave them? Let's clear for now.
        setDrillOptions({});
    }
    setIsDrillActive(startingDrill);
  };

  // console.log('App.jsx - ROOT_NOTES:', ROOT_NOTES);
  // console.log('App.jsx - Notes to Highlight:', notesToHighlight);

  return (
    <div className="App">
      <h1>Piano Helper (React Version)</h1>

      <PianoKeyboard
        rootNote={rootNoteMidi}
        notesToHighlight={notesToHighlight}
        octaveRange={OCTAVES}
        playedNotes={activeNotesArray} // <-- Pass the memoized array from App state
        expectedNotes={isDrillActive ? drillStepData.expectedMidiNotes : []} // <-- Pass expected notes
        lowestNote={48} // Example: C3
      />
      {/* Flex container for Info, Controls, and Drills */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', alignItems: 'flex-start' }}>
        <InfoDisplay
          style={{ flex: 1 }} // InfoDisplay takes 1 part
          selectedRoot={selectedRootWithOctave}
          selectedScaleType={selectedScaleType}
          selectedChordType={selectedChordType}
          currentMode={currentMode}
          diatonicTriads={diatonicTriads}
          diatonicSevenths={diatonicSevenths}
          selectedDiatonicDegree={selectedDiatonicDegree}
          showSevenths={showSevenths}
        />
        <Controls
          style={{ flex: 2 }} // Controls takes 2 parts
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
          sendMidiMessage={sendMidiMessage}

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
          drillOptions={drillOptions} // Pass the active options
          setDrillOptions={setDrillOptions} // Should this be removed? Options set on toggle.
          currentDrillStep={drillStepData}
          drillScore={currentDrillScore}
          // New props for configuration
          drillNumOctaves={drillNumOctaves}
          drillRepetitions={drillRepetitions}
          onDrillOctavesChange={handleDrillOctavesChange}
          onDrillRepetitionsChange={handleDrillRepetitionsChange}
          // Pass style state and handler
          drillStyle={drillStyle}
          onDrillStyleChange={handleDrillStyleChange}

          // --- MIDI Player Props ---
          playbackState={playbackState}
          loadedMidiFileName={loadedFileName} // Pass the name of the loaded file
          availableMidiFiles={[
              // Dynamically generated from public/midi-files (needs update if files change)
              { name: "9-8 NmlStr Tambourine 141", url: "/Piano_Helper/midi-files/JBB_9-8_NmlStr_Tambourine_141.mid" },
              { name: "4-4 NmlStr Triangles 130", url: "/Piano_Helper/midi-files/JBB_4-4_NmlStr_Triangles_130.mid" },
              { name: "4-4 NmlStr Toms 129", url: "/Piano_Helper/midi-files/JBB_4-4_NmlStr_Toms_129.mid" },
              { name: "3-4 NmlStr Shaker 128", url: "/Piano_Helper/midi-files/JBB_3-4_NmlStr_Shaker_128.mid" },
              { name: "3-4 NmlStr Kicks 127", url: "/Piano_Helper/midi-files/JBB_3-4_NmlStr_Kicks_127.mid" },
              { name: "3-4 NmlStr HiHats 126", url: "/Piano_Helper/midi-files/JBB_3-4_NmlStr_HiHats_126.mid" },
              { name: "3-4 NmlStr Cowbell 125", url: "/Piano_Helper/midi-files/JBB_3-4_NmlStr_Cowbell_125.mid" },
              { name: "3-4 NmlMedSwg Snares 124", url: "/Piano_Helper/midi-files/JBB_3-4_NmlMedSwg_Snares_124.mid" },
              { name: "3-4 NmlMedSwg Rides 123", url: "/Piano_Helper/midi-files/JBB_3-4_NmlMedSwg_Rides_123.mid" },
              { name: "2-4 NmlStr Cabasa 122", url: "/Piano_Helper/midi-files/JBB_2-4_NmlStr_Cabasa_122.mid" },
              { name: "12-8 NmlStr Congas 145", url: "/Piano_Helper/midi-files/JBB_12-8_NmlStr_Congas_145.mid" },
              { name: "12-8 NmlStr Bongos 144", url: "/Piano_Helper/midi-files/JBB_12-8_NmlStr_Bongos_144.mid" },
              { name: "9-8 NmlStr T024 FullKit 117", url: "/Piano_Helper/midi-files/JBB_9-8_NmlStr_T024_FullKit_117.mid" },
              { name: "12-8 NmlStr T096 FullKit 120", url: "/Piano_Helper/midi-files/JBB_12-8_NmlStr_T096_FullKit_120.mid" },
              { name: "6-8 NmlStr T057 FullKit 115", url: "/Piano_Helper/midi-files/JBB_6-8_NmlStr_T057_FullKit_115.mid" },
              { name: "4-4 NmlStr T088 FullKit 109", url: "/Piano_Helper/midi-files/JBB_4-4_NmlStr_T088_FullKit_109.mid" },
              { name: "4-4 NmlStr T009 FullKit 110", url: "/Piano_Helper/midi-files/JBB_4-4_NmlStr_T009_FullKit_110.mid" },
              { name: "4-4 NmlMedSwg T076 FullKit 108", url: "/Piano_Helper/midi-files/JBB_4-4_NmlMedSwg_T076_FullKit_108.mid" },
              { name: "4-4 NmlMedSwg T069 FullKit 106", url: "/Piano_Helper/midi-files/JBB_4-4_NmlMedSwg_T069_FullKit_106.mid" },
              { name: "4-4 NmlMedSwg T008 FullKit 107", url: "/Piano_Helper/midi-files/JBB_4-4_NmlMedSwg_T008_FullKit_107.mid" },
              { name: "4-4 DblTmMedSwg T017 FullKit 103", url: "/Piano_Helper/midi-files/JBB_4-4_DblTmMedSwg_T017_FullKit_103.mid" },
              { name: "4-4 DblTmMedSwg T014 FullKit 104", url: "/Piano_Helper/midi-files/JBB_4-4_DblTmMedSwg_T014_FullKit_104.mid" },
              { name: "4-4 DblTmMedSwg T007 FullKit 102", url: "/Piano_Helper/midi-files/JBB_4-4_DblTmMedSwg_T007_FullKit_102.mid" },
          ]}
          onLoadMidiFile={loadMidiFile}
          onPlayMidiFile={playMidiFile}
          onPauseMidiFile={pauseMidiFile}
          onStopMidiFile={stopMidiFile}
        />
        <DrillControls 
          style={{ flex: 1 }} // DrillControls takes 1 part
          currentMode={currentMode} // Pass mode for style disabling
          isDrillActive={isDrillActive}
          setIsDrillActive={handleDrillToggle} // Use the toggle handler
          drillNumOctaves={drillNumOctaves}
          drillRepetitions={drillRepetitions}
          drillStyle={drillStyle}
          onDrillOctavesChange={handleDrillOctavesChange}
          onDrillRepetitionsChange={handleDrillRepetitionsChange}
          onDrillStyleChange={handleDrillStyleChange}
          currentDrillStep={drillStepData}
          drillScore={currentDrillScore}
        />
      </div>
      <MidiMonitorDisplay
        logMessages={midiLogMessages}
      />

    </div>
  );
}

export default App; 