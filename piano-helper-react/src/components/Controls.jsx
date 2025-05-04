import React from 'react';

function Controls({ 
  // Root/Scale/Chord Props
  rootNotes,
  octaves,
  scaleTypes,
  chordTypes,
  selectedRootNote,
  selectedOctave,
  selectedScaleType,
  selectedChordType,
  currentMode,
  onRootChange,
  onOctaveChange,
  onScaleChange,
  onChordChange,

  // MIDI Props
  midiInputs = [], 
  midiOutputs = [], 
  selectedInputId,
  selectedOutputId,
  onSelectInput, 
  onSelectOutput,
  isMidiInitialized,
  // Metronome Props
  isMetronomePlaying,
  metronomeBpm,
  metronomeSoundNote,
  metronomeSounds,
  metronomeTimeSignature,
  onToggleMetronome,
  onChangeMetronomeTempo,
  onChangeMetronomeSound,
  onChangeMetronomeTimeSignature,
}) {

  const handleInputChange = (event) => {
    onSelectInput(event.target.value || null); // Pass null if default option selected
  };

  const handleOutputChange = (event) => {
    onSelectOutput(event.target.value || null); // Pass null if default option selected
  };

  return (
    <div style={{ border: '1px solid blue', padding: '10px', marginBottom: '10px' }}>
      <h2>Controls</h2>

      {/* --- Root / Scale / Chord Selection --- */}
      <div style={{ marginBottom: '10px' }}>
        <label>Root: </label>
        <select value={selectedRootNote} onChange={(e) => onRootChange(e.target.value)}>
          {rootNotes && rootNotes.map(note => (
            <option key={note} value={note}>{note}</option>
          ))}
        </select>
        <label style={{ marginLeft: '10px' }}>Octave: </label>
        <select value={selectedOctave} onChange={(e) => onOctaveChange(e.target.value)}>
          {octaves && octaves.map(oct => (
            <option key={oct} value={oct}>{oct}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Scale: </label>
        <select value={selectedScaleType} onChange={(e) => onScaleChange(e.target.value)}>
          {scaleTypes && scaleTypes.map(scale => (
            <option key={scale} value={scale}>{scale}</option>
          ))}
        </select>
         <span style={{ marginLeft: '5px', color: currentMode === 'scale_display' ? 'blue' : 'grey' }}>
          (Active)
        </span>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
         <label>Chord: </label>
         <select value={selectedChordType} onChange={(e) => onChordChange(e.target.value)}>
           {chordTypes && chordTypes.map(chord => (
             <option key={chord} value={chord}>{chord}</option>
           ))}
         </select>
          <span style={{ marginLeft: '5px', color: currentMode === 'chord_display' ? 'blue' : 'grey' }}>
            (Active)
          </span>
       </div>

      {/* --- MIDI Device Selection --- */}
      <div style={{ marginBottom: '10px' }}>
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

      {/* Metronome Controls */}
      <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px'}}>
        <h4>Metronome</h4>
        <div>
           <button onClick={onToggleMetronome} disabled={!selectedOutputId}> 
            {isMetronomePlaying ? 'Stop' : 'Start'}
           </button>
           <label htmlFor="metronome-bpm" style={{ marginLeft: '10px' }}> BPM: </label>
            <input 
                type="number" 
                id="metronome-bpm"
                value={metronomeBpm}
                onChange={(e) => onChangeMetronomeTempo(e.target.value)}
                min="30" 
                max="300" 
                step="1"
                style={{ width: '60px'}}
                disabled={!selectedOutputId}
            />
            <label htmlFor="metronome-sound" style={{ marginLeft: '10px' }}> Sound: </label>
            <select
                id="metronome-sound"
                value={metronomeSoundNote}
                onChange={(e) => onChangeMetronomeSound(e.target.value)}
                disabled={!selectedOutputId}
            >
                {Object.entries(metronomeSounds).map(([name, note]) => (
                    <option key={note} value={note}>
                        {name} ({note})
                    </option>
                ))}
            </select>
            {/* Time Signature Select */}
            <label htmlFor="metronome-timesig" style={{ marginLeft: '10px' }}> Time Sig: </label>
             <select
                id="metronome-timesig"
                value={metronomeTimeSignature}
                onChange={(e) => onChangeMetronomeTimeSignature(e.target.value)}
                disabled={!selectedOutputId}
            >
                <option value="none">None</option>
                <option value="3/4">3/4</option>
                <option value="4/4">4/4</option>
            </select>
        </div>
        {!selectedOutputId && isMidiInitialized && 
            <p><small>Select a MIDI Output device to enable Metronome.</small></p>}
      </div>
    </div>
  );
}

export default Controls; 