import React, { useState } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook

function App() {
  // --- State Management ---
  const [currentMode, setCurrentMode] = useState('scale_display');
  const [selectedRoot, setSelectedRoot] = useState('C4');
  const [selectedScaleType, setSelectedScaleType] = useState('major');
  // TODO: Add state for selectedChordType, displayKeyboardRange, currentNotes, etc.
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

  // --- Event Handlers (Placeholder Examples) ---
  const handleRootChange = (newRoot) => {
    setSelectedRoot(newRoot);
    // TODO: Recalculate notes
  };

  const handleScaleChange = (newScale) => {
    setSelectedScaleType(newScale);
    setCurrentMode('scale_display'); // Assuming scale change sets mode
    // TODO: Recalculate notes
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
      <PianoKeyboard />
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