import React, { useState, useMemo } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook
import { Scale, Note, Chord, ScaleType, ChordType, PcSet } from "@tonaljs/tonal"; // Import Tonal functions

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
    if (!rootNoteMidi) return [];

    const rootName = selectedRootNote; // Use state directly
    const octave = selectedOctave;

    try {
      if (currentMode === 'scale_display' && selectedScaleType) {
        const scaleData = Scale.get(`${rootName} ${selectedScaleType}`);
        if (!scaleData || !scaleData.notes) return [];
        // Get notes in the selected octave and the one above for better visualization range
        const notesInOctave = scaleData.notes.map(noteName => Note.midi(`${noteName}${octave}`)).filter(Boolean);
        const notesInNextOctave = scaleData.notes.map(noteName => Note.midi(`${noteName}${octave + 1}`)).filter(Boolean);
        return [...notesInOctave, ...notesInNextOctave];
      } else if (currentMode === 'chord_display' && selectedChordType) {
        const chordData = Chord.get(`${rootName}${selectedChordType}`); // Tonal needs root+type
         if (!chordData || !chordData.notes) return [];
         // Get chord notes starting from the selected root octave
         return Chord.getChord(selectedChordType, `${rootName}${octave}`).notes.map(Note.midi).filter(Boolean);
      } else if (currentMode === 'diatonic_chords') {
        if (!rootNoteMidi || diatonicChordNames.length === 0) return [];

        try {
          const degreeIndex = selectedDiatonicDegree;
          let chordName = diatonicChordNames[degreeIndex];
          if (!chordName) return [];

          // TODO: Handle 'showSevenths' toggle - perhaps switch to Scale.modeChords?
          // For now, uses triads from Scale.scaleChords

          // Get chord notes based on the calculated name and selected octave
          let chordNotes = Chord.getChord(chordName.includes('7') ? chordName : chordName, `${selectedRootNote}${selectedOctave}`, selectedRootNote).notes; // Chord.getChord requires rootNote
          if (!Array.isArray(chordNotes) || chordNotes.length === 0) return [];

          let midiNotes = chordNotes.map(Note.midi).filter(Boolean);
          if (midiNotes.length === 0) return [];

          // TODO: Apply RH Inversion (rhInversion state)
          // Need manual inversion logic here

          // Apply Split Hand Voicing
          if (splitHandVoicing) {
            const lhNote = rootNoteMidi - 24; // 2 octaves below ROOT of the current chord
            // We need the root of the *selected diatonic chord*, not the scale root.
            const chordRootMidi = Note.midi(Note.transpose(selectedRootWithOctave, Scale.get(scaleName).intervals[degreeIndex]));
            const actualLhNote = chordRootMidi - 24;

            // Adjust RH notes based on selectedOctave? (Already done by Chord.getChord with root+octave)
            const rhNotes = midiNotes; // Use the (inverted) midi notes
            return [actualLhNote, ...rhNotes].filter(n => n !== null && n >= 0 && n <= 127);
          } else {
            return midiNotes.filter(n => n !== null && n >= 0 && n <= 127);
          }
        } catch (error) {
          console.error("Error calculating diatonic chord notes:", error);
          return [];
        }
      }
    } catch (error) {
        console.error("Error calculating notes:", error);
        return []; // Return empty array on error
    }
    return [];
  }, [selectedRootNote, selectedOctave, selectedScaleType, selectedChordType, currentMode, rootNoteMidi, diatonicChordNames, selectedDiatonicDegree, showSevenths, splitHandVoicing, rhInversion]);

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