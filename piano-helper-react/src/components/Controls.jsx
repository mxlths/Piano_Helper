import React from 'react';

function Controls({ 
  midiInputs = [], 
  midiOutputs = [], 
  selectedInputId,
  selectedOutputId,
  onSelectInput, 
  onSelectOutput,
  isMidiInitialized
  // TODO: Add Metronome controls/props later
}) {

  const handleInputChange = (event) => {
    onSelectInput(event.target.value || null); // Pass null if default option selected
  };

  const handleOutputChange = (event) => {
    onSelectOutput(event.target.value || null); // Pass null if default option selected
  };

  return (
    <div style={{ border: '1px solid blue', padding: '10px', margin: '10px 0' }}>
      <h2>Controls</h2>
      
      {/* MIDI Device Selectors */} 
      <div>
        <label htmlFor="midi-input">MIDI Input: </label>
        <select 
          id="midi-input" 
          value={selectedInputId || ''} // Controlled component
          onChange={handleInputChange} 
          disabled={!isMidiInitialized || midiInputs.length === 0}
        >
          <option value="">-- Select Input --</option>
          {midiInputs.map(input => (
            <option key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="midi-output">MIDI Output: </label>
        <select 
          id="midi-output" 
          value={selectedOutputId || ''} // Controlled component
          onChange={handleOutputChange} 
          disabled={!isMidiInitialized || midiOutputs.length === 0}
        >
          <option value="">-- Select Output --</option>
          {midiOutputs.map(output => (
            <option key={output.id} value={output.id}>
              {output.name}
            </option>
          ))}
        </select>
      </div>

      {!isMidiInitialized && <p><small>Initializing MIDI...</small></p>}
      {isMidiInitialized && midiInputs.length === 0 && midiOutputs.length === 0 && 
        <p><small>MIDI Initialized, but no devices found.</small></p>
      }

      {/* TODO: Placeholder for Metronome Controls */} 
      {/* <p>Metronome Controls will go here...</p> */}
    </div>
  );
}

export default Controls; 