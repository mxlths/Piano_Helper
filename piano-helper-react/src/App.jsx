import React, { useState, useMemo } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook
import { Scale, Note } from "@tonaljs/tonal"; // Import Tonal functions

function App() {
  // --- State Management ---
  const [currentMode, setCurrentMode] = useState('scale_display');
  const [selectedRoot, setSelectedRoot] = useState('C4'); // Keep octave for root MIDI calc
  const [selectedScaleType, setSelectedScaleType] = useState('major');
  // TODO: Add state for selectedChordType, displayKeyboardRange
  // TODO: Add state for MIDI devices, metronome settings later

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
  const rootNoteMidi = useMemo(() => Note.midi(selectedRoot), [selectedRoot]);
  const notesToHighlight = useMemo(() => {
    if (!rootNoteMidi) return [];
    // Tonal expects root without octave for scale generation
    const rootName = Note.pitchClass(selectedRoot);
    if (currentMode === 'scale_display' && selectedScaleType) {
      const scaleNotes = Scale.get(`${rootName} ${selectedScaleType}`).notes;
      // Map scale notes to midi numbers within a reasonable range (e.g., around the root)
      // We need to decide how to handle octaves here. For now, let's get MIDI nums in the octave of the root.
      const rootOctave = Note.octave(selectedRoot);
      return scaleNotes.map(noteName => Note.midi(`${noteName}${rootOctave}`)).filter(Boolean); // filter out nulls
    } else if (currentMode === 'chord_display' /* && selectedChordType */) {
      // TODO: Implement chord logic
      return [];
    }
    return [];
  }, [selectedRoot, selectedScaleType, currentMode, rootNoteMidi]);

  // --- Event Handlers (Placeholder Examples) ---
  const handleRootChange = (newRoot) => {
    // Ensure root has an octave, default to 4 if missing
    setSelectedRoot(Note.get(newRoot).pc ? Note.get(newRoot).name : 'C4');
  };

  const handleScaleChange = (newScale) => {
    setSelectedScaleType(newScale);
    setCurrentMode('scale_display'); // Assuming scale change sets mode
  };

  return (
    <div className="App">
      <h1>Piano Helper (React Version)</h1>
      
      <Controls 
        midiInputs={midiInputs}
        midiOutputs={midiOutputs}
        selectedInputId={selectedInputId}
        selectedOutputId={selectedOutputId}
        onSelectInput={selectMidiInput}
        onSelectOutput={selectMidiOutput}
        isMidiInitialized={isMidiInitialized}
        // --- Metronome Props ---
        isMetronomePlaying={isMetronomePlaying}
        metronomeBpm={metronomeBpm}
        metronomeSoundNote={metronomeSoundNote}
        metronomeSounds={metronomeSounds}
        onToggleMetronome={toggleMetronomePlay}
        onChangeMetronomeTempo={changeMetronomeTempo}
        onChangeMetronomeSound={changeMetronomeSound}
        metronomeTimeSignature={metronomeTimeSignature}
        onChangeMetronomeTimeSignature={changeMetronomeTimeSignature}
      />
      <PianoKeyboard
        rootNote={rootNoteMidi} // Pass MIDI number for root
        notesToHighlight={notesToHighlight} // Pass array of MIDI numbers
        // range={{ startNote: 60, numOctaves: 2 }} // Pass range if needed, or keep it internal for now
      />
      <InfoDisplay 
        selectedRoot={selectedRoot} 
        selectedScaleType={selectedScaleType} 
        currentMode={currentMode}
      />
      <MidiMonitorDisplay 
        logMessages={midiLogMessages}
      />

    </div>
  );
}

export default App; 