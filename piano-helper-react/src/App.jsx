import React, { useState, useMemo } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook
import { Scale, Note, Chord, ScaleType, ChordType, PcSet } from "@tonaljs/tonal"; // Import Tonal functions

console.log("Tonal PcSet object:", PcSet); // <-- Add log for PcSet object

// --- Constants for Dropdowns ---
// const ROOT_NOTES = PcSet.chroma(); // ["C", "C#", "D", ...] // TEMP: PcSet.chroma() returning '000000000000'
const ROOT_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; // <-- Hardcoded workaround
const OCTAVES = [2, 3, 4, 5]; // Example octave range
const SCALE_TYPES = ScaleType.names();
const CHORD_TYPES = ChordType.names(); // Could filter this later for common chords

function App() {
  // --- State Management ---
  const [currentMode, setCurrentMode] = useState('scale_display'); // 'scale_display' or 'chord_display'
  const [selectedRootNote, setSelectedRootNote] = useState('C'); // Just the pitch class
  const [selectedOctave, setSelectedOctave] = useState(4); // Separate octave
  const [selectedScaleType, setSelectedScaleType] = useState('major');
  const [selectedChordType, setSelectedChordType] = useState('maj7'); // Add chord state
  // TODO: Add state for displayKeyboardRange

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
      }
    } catch (error) {
        console.error("Error calculating notes:", error);
        return []; // Return empty array on error
    }
    return [];
  }, [selectedRootNote, selectedOctave, selectedScaleType, selectedChordType, currentMode, rootNoteMidi]);

  // --- Event Handlers ---
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
    }
  };

   const handleChordChange = (newChord) => {
    if (CHORD_TYPES.includes(newChord)) {
      setSelectedChordType(newChord);
      setCurrentMode('chord_display');
    }
  };

  console.log('App.jsx - ROOT_NOTES:', ROOT_NOTES); // <-- Add console log here

  return (
    <div className="App">
      <h1>Piano Helper (React Version)</h1>
      
      <Controls
        // Root/Scale/Chord Selection
        rootNotes={ROOT_NOTES}
        octaves={OCTAVES}
        scaleTypes={SCALE_TYPES}
        chordTypes={CHORD_TYPES}
        selectedRootNote={selectedRootNote}
        selectedOctave={selectedOctave}
        selectedScaleType={selectedScaleType}
        selectedChordType={selectedChordType}
        currentMode={currentMode}
        onRootChange={handleRootChange}
        onOctaveChange={handleOctaveChange}
        onScaleChange={handleScaleChange}
        onChordChange={handleChordChange}

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
        rootNote={rootNoteMidi} // Pass MIDI number for root
        notesToHighlight={notesToHighlight} // Pass array of MIDI numbers
        // range={{ startNote: 60, numOctaves: 2 }} // Piano range is still internal
      />
      <InfoDisplay
        selectedRoot={selectedRootWithOctave} // Pass combined root+octave
        selectedScaleType={selectedScaleType}
        selectedChordType={selectedChordType} // Pass chord type
        currentMode={currentMode}
      />
      <MidiMonitorDisplay
        logMessages={midiLogMessages}
      />

    </div>
  );
}

export default App; 