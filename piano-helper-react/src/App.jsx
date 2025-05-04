import React, { useState, useMemo } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook
import { Scale, Note, Chord, ScaleType, ChordType, PcSet, Interval } from "@tonaljs/tonal"; // Import Tonal functions and Interval

console.log("Tonal PcSet object:", PcSet); // <-- Add log for PcSet object

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

  // MIDI state and functions from our custom hook
  const {
    isInitialized: isMidiInitialized, // Rename for clarity
    inputs: midiInputs,
    outputs: midiOutputs,
    selectedInputId,
    selectedOutputId,
    logMessages: midiLogMessages,
    selectInput: selectMidiInput, // Rename for clarity
    selectOutput: selectMidiOutput, // Rename for clarity
    sendMessage: sendMidiMessage, // Import sendMessage
  } = useMidi();

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
  const selectedRootWithOctave = useMemo(() => `${selectedRootNote}${selectedOctave}`, [selectedRootNote, selectedOctave]);
  const rootNoteMidi = useMemo(() => Note.midi(selectedRootWithOctave), [selectedRootWithOctave]);
  const scaleName = useMemo(() => `${selectedRootNote} ${selectedScaleType}`, [selectedRootNote, selectedScaleType]);

  // Calculate diatonic chords based on scale (Triads first, handle 7ths later)
  const diatonicChordNames = useMemo(() => {
      try {
        // Tonal expects scale name like "C major"
        const chords = Scale.scaleChords(scaleName);
        // const chords = Scale.modeChords(scaleName); // Use this later for sevenths?
        return Array.isArray(chords) ? chords : [];
      } catch {
          return []; // Handle invalid scale name
      }
  }, [scaleName]);

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
        if (diatonicChordNames.length === 0) return [];

        const degreeIndex = selectedDiatonicDegree;
        // Get the base diatonic chord name (triad)
        let baseChordName = diatonicChordNames[degreeIndex]; 
        if (!baseChordName) return [];

        // Determine the actual chord name (triad or seventh)
        let targetChordName = baseChordName;
        if (showSevenths) {
            // Construct the 7th chord name. Use Scale.seventhChords()
            const seventhChords = Scale.seventhChords(scaleName); // <-- Correct function name
            if (Array.isArray(seventhChords) && seventhChords[degreeIndex]) {
                targetChordName = seventhChords[degreeIndex];
            } else {
                 console.warn(`Could not determine 7th chord for degree ${degreeIndex} of ${scaleName}. Using triad.`);
            }
        }
        
        // Find the root note of this specific diatonic chord
        const intervals = Scale.get(scaleName).intervals;
        const chordRootName = Note.transpose(rootName, intervals[degreeIndex]);
        const chordRootWithOctave = `${chordRootName}${octave}`;
        const chordRootMidi = Note.midi(chordRootWithOctave);
        if (!chordRootMidi) return [];

        // Get the notes of the target chord (triad or seventh) starting at the correct octave
        const chordData = Chord.getChord(targetChordName, chordRootWithOctave);
        if (!chordData || !Array.isArray(chordData.notes) || chordData.notes.length === 0) return [];

        let chordNotes = chordData.notes; // Note names with correct octave

        // Apply RH Inversion
        if (rhInversion > 0 && rhInversion < chordNotes.length) {
            // Simple cyclic permutation for inversion
            const inversionSlice = chordNotes.slice(0, rhInversion);
            const remainingSlice = chordNotes.slice(rhInversion);
            // Transpose the moved notes up an octave
            const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P')); 
            chordNotes = [...remainingSlice, ...invertedNotes];
        }
        
        let midiNotes = chordNotes.map(Note.midi).filter(Boolean);
        if (midiNotes.length === 0) return [];

        // Apply Split Hand Voicing
        if (splitHandVoicing) {
          // Ensure chordRootMidi is valid before calculating LH note
          if (chordRootMidi !== null && chordRootMidi >= 24) { // Check if MIDI is valid and high enough for LH note
              const actualLhNote = chordRootMidi - 24; // 2 octaves below the chord root
              // Combine LH note with RH notes (which are already calculated and possibly inverted)
              calculatedNotes = [actualLhNote, ...midiNotes];
          } else {
              console.warn("Could not calculate valid LH note for split voicing.");
              calculatedNotes = midiNotes; // Fallback to only RH notes
          }
        } else {
          calculatedNotes = midiNotes;
        }
      }
    } catch (error) {
      console.error("Error calculating notes:", error);
      calculatedNotes = []; // Return empty array on error
    }

    // Filter final notes
    return calculatedNotes.filter(n => n !== null && n >= 0 && n <= 127);

  }, [currentMode, selectedRootNote, selectedOctave, selectedScaleType, selectedChordType, rootNoteMidi, scaleName, diatonicChordNames, selectedDiatonicDegree, showSevenths, splitHandVoicing, rhInversion]);

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
      setCurrentMode('chord_display');
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

        // Diatonic Chord Mode Props
        diatonicChordNames={diatonicChordNames}
        selectedDiatonicDegree={selectedDiatonicDegree}
        showSevenths={showSevenths}
        splitHandVoicing={splitHandVoicing}
        rhInversion={rhInversion}
        inversions={INVERSIONS} // Pass inversion options
        onDiatonicDegreeChange={handleDiatonicDegreeChange}
        onShowSeventhsChange={handleShowSeventhsChange}
        onSplitHandVoicingChange={handleSplitHandVoicingChange}
        onRhInversionChange={handleRhInversionChange}

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
      />
      <PianoKeyboard
        rootNote={rootNoteMidi} // Keep highlighting the scale root for context?
        notesToHighlight={notesToHighlight}
      />
      <InfoDisplay
        // Pass necessary state for diatonic mode display
        selectedRoot={selectedRootWithOctave}
        selectedScaleType={selectedScaleType}
        selectedChordType={selectedChordType}
        currentMode={currentMode}
        diatonicChordNames={diatonicChordNames} // Pass chord names
        selectedDiatonicDegree={selectedDiatonicDegree} // Pass selected degree
        showSevenths={showSevenths} // Pass seventh state
      />
      <MidiMonitorDisplay
        logMessages={midiLogMessages}
      />

    </div>
  );
}

export default App; 