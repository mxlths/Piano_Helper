import React, { useState, useEffect } from 'react';
import { Note, Scale, Chord } from '@tonaljs/tonal'; // Import for getting degree names and scale intervals

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
  { id: 'drills', label: 'Drills' },
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
  // Add new props for split interval
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
  // --- Drill Props ---
  isDrillActive,
  setIsDrillActive,
  drillOptions,
  setDrillOptions,
  currentDrillStep,
  drillScore,
  // New props for drill config
  drillNumOctaves,
  drillRepetitions,
  onDrillOctavesChange,
  onDrillRepetitionsChange,
  // Add style props
  drillStyle,
  onDrillStyleChange,

  // --- MIDI Player Props ---
  playbackState, // 'stopped', 'playing', 'paused'
  loadedMidiFileName,
  availableMidiFiles = [],
  onLoadMidiFile,
  onPlayMidiFile,
  onPauseMidiFile,
  onStopMidiFile
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

      {/* Tab Navigation */}
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

        {/* === Drills Tab === */} 
        {activeTab === 'drills' && (
           <div style={{ border: 'none', padding: '0' }}> {/* Remove border/padding from original flex item */} 
              <h4>Drill Controls</h4>
              <div>
                  <label htmlFor="drill-octaves" style={{ marginRight: '10px' }}>Octaves (Range):</label>
                  <input 
                     type="number" 
                     id="drill-octaves" 
                     value={drillNumOctaves} 
                     onChange={onDrillOctavesChange} 
                     min="1" 
                     max="4" // Match limit in App.jsx
                     disabled={isDrillActive} 
                     style={{ width: '50px', marginRight: '20px' }}
                  />

                   <label htmlFor="drill-style" style={{ marginRight: '10px' }}>Style:</label>
                   <select 
                      id="drill-style"
                      value={drillStyle}
                      onChange={onDrillStyleChange}
                      disabled={isDrillActive} 
                      style={{ marginRight: '20px' }}
                   >
                      {DRILL_STYLES.map(styleOpt => (
                          <option 
                             key={styleOpt.value} 
                             value={styleOpt.value}
                             // Disable "Thirds" if not in scale mode
                             disabled={styleOpt.value === 'thirds' && currentMode !== 'scale_display'}
                          >
                              {styleOpt.label}
                          </option>
                      ))}
                   </select>

                   <label htmlFor="drill-repetitions" style={{ marginRight: '10px' }}>Repetitions:</label>
                   <input 
                      type="number" 
                      id="drill-repetitions" 
                      value={drillRepetitions} 
                      onChange={onDrillRepetitionsChange} 
                      min="1" 
                      max="10" // Match limit in App.jsx
                      disabled={isDrillActive}
                      style={{ width: '50px', marginRight: '20px' }}
                   />

                   <button onClick={setIsDrillActive} style={{ marginLeft: '20px' }}>
                       {isDrillActive ? 'Stop Drill' : 'Start Drill'}
                   </button>
              </div>
              {isDrillActive && (
                  <div style={{ marginTop: '10px' }}>
                     <span>Step: {currentDrillStep?.stepIndex !== undefined ? currentDrillStep.stepIndex + 1 : '-'} / {currentDrillStep?.totalSteps || '-'} | </span>
                      <span>Score: Correct: {drillScore?.correctNotes || 0}, Incorrect: {drillScore?.incorrectNotes || 0}</span>
                      <p style={{ fontWeight: 'bold', marginTop: '5px' }}>
                         Current: {currentDrillStep?.stepLabel || 'Loading...'}
                      </p>
                      {/* Optionally display expected notes for debugging:
                      <p>Expected: {currentDrillStep?.expectedMidiNotes?.join(', ')}</p>
                      */}
                 </div>
              )}
           </div>
        )}
      </div>

    </div>
  );
}

export default Controls; 