import React, { useState, useEffect } from 'react';
import { Note, Scale, Chord } from '@tonaljs/tonal'; // Import for getting degree names and scale intervals
import Gm2SoundSelector from './Gm2SoundSelector'; // Import the placeholder component

// Define styles outside the component
const DRILL_STYLES = [
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
  { value: 'random', label: 'Random' },
  { value: 'thirds', label: 'Thirds (Scales Only)' }, // Label indicates restriction
];

// Define Tabs
const TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'metronome', label: 'Metronome' },
  { id: 'backingTrack', label: 'Backing Track' },
  { id: 'gm2Sounds', label: 'GM2 Sounds' }, // Tab UN-Removed
];

function Controls({ 
  // Mode
  modes,
  currentMode,
  onModeChange,

  // Root/Scale/Chord Props
  rootNotes,
  octaves,
  scaleTypes,
  chordTypes,
  selectedRootNote,
  selectedOctave,
  selectedScaleType,
  selectedChordType,
  onRootChange,
  onOctaveChange,
  onScaleChange,
  onChordChange,

  // Diatonic Chord Mode Props
  diatonicTriads = [],
  diatonicSevenths = [],
  selectedDiatonicDegree,
  showSevenths,
  splitHandVoicing,
  rhInversion,
  inversions,
  onDiatonicDegreeChange,
  onShowSeventhsChange,
  onSplitHandVoicingChange,
  onRhInversionChange,
  splitHandInterval,
  onSplitHandIntervalChange,

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
  
  // --- MIDI Player Props ---
  playbackState,
  loadedMidiFileName,
  availableMidiFiles = [],
  onLoadMidiFile,
  onPlayMidiFile,
  onPauseMidiFile,
  onStopMidiFile,
  style, // Keep style prop passed from App
  
  // Chord Progression Props <-- NEW
  availableProgressions = [],
  selectedProgressionId,
  onProgressionChange,

  // Voicing Props <-- NEW
  voicingSplitHand,
  voicingLhOctaveOffset,
  voicingRhRootless,
  onVoicingSplitHandChange,
  onVoicingLhOffsetChange,
  onVoicingRhRootlessChange,
  voicingUseShell,
  voicingAddOctaveRoot,
  onVoicingUseShellChange,
  onVoicingAddOctaveRootChange,

  // Essential props (log might still be needed elsewhere in Controls)
  log, 
  sendMessage, // ADD sendMessage BACK - Gm2SoundSelector needs it
}) {

  const [activeTab, setActiveTab] = useState(TABS[0].id); // Default to 'setup' tab

  // Add useEffect to log prop changes
  useEffect(() => {
    // console.log(`[Controls.jsx] Props received - playbackState: ${playbackState}, loadedMidiFileName: ${loadedMidiFileName}`);
  }, [playbackState, loadedMidiFileName]);

  // console.log('Controls.jsx - Received diatonicTriads prop:', diatonicTriads);
  // console.log('Controls.jsx - Received diatonicSevenths prop:', diatonicSevenths);
  //console.log('Controls.jsx - Diatonic Chords:', diatonicChordTypes);

  const handleInputChange = (event) => {
    onSelectInput(event.target.value || null);
  };

  const handleOutputChange = (event) => {
    onSelectOutput(event.target.value || null);
  };

  // Helper to get Roman Numeral (basic)
  const getRomanNumeral = (degree) => {
      const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      return numerals[degree] || '?';
  };

  // Helper to determine quality for button styling (simplified)
  const getChordQuality = (chordName) => {
      if (!chordName) return '';
      if (chordName.includes('m') && !chordName.includes('maj')) return 'minor';
      if (chordName.includes('dim')) return 'diminished';
      if (chordName.includes('aug')) return 'augmented';
      return 'major';
  };

  return (
    <div style={{ border: '1px solid blue', padding: '10px', marginBottom: '10px' }}>
      <h2>Controls</h2>

      {/* Tab Navigation (GM2 tab is removed from TABS definition) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '15px' }}>
        {TABS.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid blue' : '3px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Conditionally Rendered */}
      <div>
        {/* === Setup Tab === */}
        {activeTab === 'setup' && (
          <div>
            {/* --- Mode Selection --- */}
             <div style={{ marginBottom: '15px' }}>
               <label htmlFor="mode-select">Mode: </label>
               <select id="mode-select" value={currentMode} onChange={(e) => onModeChange(e.target.value)}>
                 {modes && modes.map(mode => (
                   <option key={mode.value} value={mode.value}>{mode.label}</option>
                 ))}
               </select>
             </div>
            {/* --- Root & Scale Selection (Always Visible) --- */}
            <div style={{ marginBottom: '10px' }}>
               <label>Root: </label>
               <select value={selectedRootNote} onChange={(e) => onRootChange(e.target.value)}>
                 {Array.isArray(rootNotes) && rootNotes.map(note => (
                   <option key={note} value={note}>{note}</option>
                 ))}
               </select>
               <label style={{ marginLeft: '10px' }}>Octave: </label>
               <select value={selectedOctave} onChange={(e) => onOctaveChange(e.target.value)}>
                  {Array.isArray(octaves) && octaves.map(oct => (
                   <option key={oct} value={oct}>{oct}</option>
                  ))}
               </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
               <label>Scale: </label>
               <select value={selectedScaleType} onChange={(e) => onScaleChange(e.target.value)}>
                  {Array.isArray(scaleTypes) && scaleTypes.map(scale => (
                    <option key={scale} value={scale}>{scale}</option>
                  ))}
                </select>
            </div>
            {/* --- Chord Search (Only for 'chord_search' mode) --- */}
            {currentMode === 'chord_search' && (
              <div style={{ marginBottom: '15px', borderLeft: '3px solid lightgrey', paddingLeft: '10px' }}>
                 <label>Chord Type: </label>
                 <select value={selectedChordType} onChange={(e) => onChordChange(e.target.value)}>
                    {Array.isArray(chordTypes) && chordTypes.map(chord => (
                     <option key={chord} value={chord}>{chord}</option>
                    ))}
                 </select>
               </div>
            )}
            {/* --- Chord Progression Selection (Only for 'chord_progression' mode) --- */}
            {currentMode === 'chord_progression' && (
              <div style={{ marginBottom: '15px', borderLeft: '3px solid lightcoral', paddingLeft: '10px' }}>
                 <label htmlFor="progression-select">Progression: </label>
                 <select 
                    id="progression-select" 
                    value={selectedProgressionId || ''} 
                    onChange={(e) => onProgressionChange(e.target.value)}
                 >
                    {/* Add a default/placeholder option? */} 
                    {/* <option value="">-- Select Progression --</option> */} 
                    {availableProgressions.map(prog => (
                     <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                 </select>
              </div>
            )}
            {/* --- Voicing Options (Duplicate for Chord Progression Mode Clarity) --- */}
            {currentMode === 'chord_progression' && (
              <div style={{ marginTop: '15px', borderLeft: '3px solid lightseagreen', paddingLeft: '10px' }}>
                <h4>Progression Voicing Options</h4>
                {/* Show 7ths Checkbox */}
                <div style={{ marginBottom: '10px' }}>
                   <label htmlFor="prog-show-sevenths">
                     <input 
                         type="checkbox" 
                         id="prog-show-sevenths" 
                         checked={showSevenths} 
                         onChange={onShowSeventhsChange}
                     />
                      Show 7ths
                   </label>
                </div>
                 {/* RH Inversion Select */}
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="prog-rh-inversion" style={{ marginRight: '5px' }}>RH Inversion:</label>
                    <select 
                        id="prog-rh-inversion"
                        value={rhInversion}
                        onChange={(e) => onRhInversionChange(e.target.value)}
                    >
                        {inversions && inversions.map(inv => (
                            <option 
                              key={inv.value} 
                              value={inv.value}
                              disabled={inv.value === 3 && !showSevenths} // Disable 3rd inv if not 7ths
                            >
                                {inv.label}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Split Hand Checkbox */}
                <div style={{ marginBottom: '10px' }}>
                   <input
                     type="checkbox"
                     id="prog-split-hand"
                     checked={voicingSplitHand}
                     onChange={onVoicingSplitHandChange}
                   />
                   <label htmlFor="prog-split-hand"> Split Hand (LH Root / RH Chord)</label>
                </div>

                {/* LH Octave Offset (Only if Split Hand active) */}
                {voicingSplitHand && (
                  <div style={{ marginLeft: '20px', marginBottom: '10px' }}>
                    <label style={{ marginRight: '10px' }}>LH Octave:</label>
                    <label style={{ marginRight: '15px' }}>
                      <input
                        type="radio"
                        name="prog-lhOffset"
                        value={-12} // 1 Octave Down
                        checked={voicingLhOctaveOffset === -12}
                        onChange={(e) => onVoicingLhOffsetChange(e.target.value)}
                      /> -1 Oct
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="prog-lhOffset"
                        value={-24} // 2 Octaves Down
                        checked={voicingLhOctaveOffset === -24}
                        onChange={(e) => onVoicingLhOffsetChange(e.target.value)}
                      /> -2 Oct
                    </label>
                  </div>
                )}

                {/* RH Rootless Checkbox (Only if Split Hand active) */}
                {voicingSplitHand && (
                  <div style={{ marginLeft: '20px', marginBottom: '10px' }}>
                    <label htmlFor="prog-rh-rootless">
                      <input
                        type="checkbox"
                        id="prog-rh-rootless"
                        checked={voicingRhRootless}
                        onChange={onVoicingRhRootlessChange}
                        disabled={!voicingSplitHand} // Disable if split hand off
                      />
                        Rootless RH Chord
                    </label>
                  </div>
                )}

                {/* Shell Voicing Checkbox */}
                <div style={{ marginBottom: '10px' }}>
                   <label htmlFor="prog-shell-voicing">
                     <input
                       type="checkbox"
                       id="prog-shell-voicing"
                       checked={voicingUseShell}
                       onChange={onVoicingUseShellChange}
                     />
                      Shell Voicing (R, 3, 7)
                   </label>
                 </div>
                 {/* Add Upper Octave Root Checkbox */}
                 <div style={{ marginBottom: '10px' }}>
                   <label htmlFor="prog-add-octave-root">
                     <input
                       type="checkbox"
                       id="prog-add-octave-root"
                       checked={voicingAddOctaveRoot}
                       onChange={onVoicingAddOctaveRootChange}
                     />
                      Add Upper Octave Root
                   </label>
                 </div>
              </div>
            )}
            {/* --- Diatonic Chord Controls (Only for 'diatonic_chords' mode) --- */}
            {currentMode === 'diatonic_chords' && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <h4>Diatonic Chords</h4>
                <div style={{ marginBottom: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {(showSevenths ? diatonicSevenths : diatonicTriads).map((fullChordName, index) => {
                      if (!fullChordName) return null;
                      
                      const chordData = Chord.get(fullChordName);
                      const quality = chordData.quality;
                      const roman = getRomanNumeral(index);
                      
                      let qualityStyle = {};
                      if (quality === 'Minor') qualityStyle.fontWeight = 'normal';
                      if (quality === 'Diminished') qualityStyle.opacity = 0.7;
                      
                      const buttonText = `${quality === 'Minor' ? roman.toLowerCase() : roman}${quality === 'Diminished' ? '°' : ''}`;
                      const isActive = index === selectedDiatonicDegree;

                      return (
                          <button 
                              key={index} 
                              onClick={() => onDiatonicDegreeChange(index)}
                              style={{
                                  ...qualityStyle,
                                  border: isActive ? '2px solid blue' : '1px solid grey',
                                  padding: '5px 8px',
                              }}
                              title={fullChordName}
                          >
                              {buttonText} ({fullChordName})
                          </button>
                      );
                   })}
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <div>
                        <input 
                            type="checkbox" 
                            id="show-sevenths" 
                            checked={showSevenths} 
                            onChange={onShowSeventhsChange}
                        />
                        <label htmlFor="show-sevenths"> Show 7ths</label>
                    </div>
                     <div>
                        <input 
                            type="checkbox" 
                            id="split-hand" 
                            checked={splitHandVoicing} 
                            onChange={onSplitHandVoicingChange}
                        />
                        <label htmlFor="split-hand"> Split Hand Voicing</label>
                    </div>
                    {/* New Control for Split Interval */} 
                    {splitHandVoicing && (
                      <div style={{ marginLeft: '10px' }}>
                        <label style={{ marginRight: '5px' }}>Interval:</label>
                        <label style={{ marginRight: '10px' }}>
                          <input 
                            type="radio" 
                            name="splitInterval" 
                            value="12" 
                            checked={splitHandInterval === 12} 
                            onChange={onSplitHandIntervalChange} 
                          /> 1 Octave
                        </label>
                        <label>
                          <input 
                            type="radio" 
                            name="splitInterval" 
                            value="24" 
                            checked={splitHandInterval === 24} 
                            onChange={onSplitHandIntervalChange} 
                          /> 2 Octaves
                        </label>
                      </div>
                    )}
                    <div>
                        <label htmlFor="rh-inversion" style={{ marginRight: '5px' }}>RH Inversion:</label>
                        <select 
                            id="rh-inversion"
                            value={rhInversion}
                            onChange={(e) => onRhInversionChange(e.target.value)}
                        >
                            {inversions && inversions.map(inv => (
                                <option 
                                  key={inv.value} 
                                  value={inv.value}
                                  disabled={inv.value === 3 && !showSevenths} // Disable 3rd inv if not 7ths
                                >
                                    {inv.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Rootless RH Checkbox (Added for Diatonic Mode) */} 
                {splitHandVoicing && (
                   <div style={{ marginTop: '10px', marginLeft: '15px' }}>
                     <label htmlFor="diatonic-rh-rootless">
                       <input
                         type="checkbox"
                         id="diatonic-rh-rootless"
                         checked={voicingRhRootless} // Use the shared state
                         onChange={onVoicingRhRootlessChange} // Use the shared handler
                         disabled={!splitHandVoicing} // Disable if split hand off
                       />
                        Rootless RH Chord
                     </label>
                   </div>
                )}
                {/* Shell Voicing Checkbox (Diatonic) */}
                <div style={{ marginTop: '10px', marginLeft: '15px' }}>
                   <label htmlFor="diatonic-shell-voicing">
                       <input
                           type="checkbox"
                           id="diatonic-shell-voicing"
                           checked={voicingUseShell}
                           onChange={onVoicingUseShellChange}
                       />
                       Shell Voicing (R, 3, 7)
                   </label>
                </div>
                 {/* Add Upper Octave Root Checkbox (Diatonic) */}
                <div style={{ marginTop: '10px', marginLeft: '15px' }}>
                   <label htmlFor="diatonic-add-octave-root">
                       <input
                           type="checkbox"
                           id="diatonic-add-octave-root"
                           checked={voicingAddOctaveRoot}
                           onChange={onVoicingAddOctaveRootChange}
                       />
                       Add Upper Octave Root
                   </label>
                </div>
              </div>
            )}
             {/* --- MIDI Device Selection --- */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '15px'}}>
                <h4>MIDI Devices</h4>
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
            </div>
          </div>
        )}

        {/* === Metronome Tab === */}
        {activeTab === 'metronome' && (
           <div style={{ border: 'none', padding: '0' }}> {/* Remove border/padding from original flex item */}
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
                  <p><small>Select a MIDI Output device (in Setup tab) to enable Metronome.</small></p>}
           </div>
        )}

        {/* === Backing Track Tab === */}
        {activeTab === 'backingTrack' && (
           <div style={{ border: 'none', padding: '0' }}> {/* Remove border/padding from original flex item */} 
              <h4>MIDI Backing Track</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label htmlFor="midi-file-select">Select Track:</label>
                <select 
                  id="midi-file-select"
                  onChange={(e) => onLoadMidiFile(e.target.value)} // Call load with the selected URL
                  value={availableMidiFiles.find(f => f.name === loadedMidiFileName)?.url || ""} // Reflect currently loaded file URL
                  disabled={playbackState === 'playing' || playbackState === 'paused'} // Disable while playing/paused
                >
                  <option value="">-- Choose a MIDI file --</option>
                  {availableMidiFiles.map(file => (
                    <option key={file.url} value={file.url}>{file.name}</option>
                  ))}
                </select>

                <button 
                  onClick={onPlayMidiFile} 
                  disabled={!loadedMidiFileName || playbackState === 'playing'} // Disable if no file loaded or already playing
                >
                  Play
                </button>
                <button 
                  onClick={onPauseMidiFile} 
                  disabled={playbackState !== 'playing'} // Disable if not playing
                >
                  Pause
                </button>
                <button 
                  onClick={onStopMidiFile} 
                  disabled={playbackState === 'stopped'} // Disable if already stopped
                >
                  Stop
                </button>

                {loadedMidiFileName && (
                  <span style={{ marginLeft: '15px', fontStyle: 'italic' }}>
                    Loaded: {loadedMidiFileName}
                  </span>
                )}
                 {playbackState !== 'stopped' && (
                   <span style={{ marginLeft: '15px', fontWeight: 'bold' }}>
                      ({playbackState})
                   </span>
                 )}
              </div>
               {!selectedOutputId && isMidiInitialized && 
                   <p style={{marginTop: '5px'}}><small>Select a MIDI Output device (in Setup tab) to enable playback.</small></p>}
           </div>
        )}

        {/* === BLOCK INTENTIONALLY LEFT EMPTY - GM2 REMOVED === */}

        {/* === Add GM2 Selector Rendering */}
        {activeTab === 'gm2Sounds' && (
            <Gm2SoundSelector
                selectedOutputId={selectedOutputId} // Pass the output ID
                sendMessage={sendMessage}            // Pass the MIDI send function
                log={log}                          // Pass the log function
            />
        )}

        {/* === Other potential tabs REMOVED / commented out === */}
        {/* {activeTab === 'diatonic' && ( ... )} */}
      </div>

    </div> // End of main Controls div
  );
}

export default Controls; 