import React, { useState, useEffect, useMemo } from 'react';
import { Note, Scale, Chord } from '@tonaljs/tonal'; // Import for getting degree names and scale intervals
import Gm2SoundSelector from './Gm2SoundSelector'; // Import the placeholder component
import {
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  Stack, // For easier layout
  Divider // For visual separation
} from '@mui/material';

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

// Helper function for Tab Panels (Accessibility)
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`controls-tabpanel-${index}`}
      aria-labelledby={`controls-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}> {/* Add padding top to panel content */}
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `controls-tab-${index}`,
    'aria-controls': `controls-tabpanel-${index}`,
  };
}

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
  // --- NEW MIDI Genre Props ---
  midiGenres = [], // Add default empty array
  selectedMidiGenre,
  onMidiGenreChange,
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

  // *** Log received midiInputs and midiOutputs props ***
  console.log('[Controls.jsx] Received midiInputs prop:', midiInputs);
  console.log('[Controls.jsx] Received midiOutputs prop:', midiOutputs);

  // Use index for MUI Tabs state
  const [activeTabIndex, setActiveTabIndex] = useState(0); 

  const handleTabChange = (event, newIndex) => {
    setActiveTabIndex(newIndex);
  };

  // Add useEffect to log prop changes
  useEffect(() => {
    // console.log(`[Controls.jsx] Props received - playbackState: ${playbackState}, loadedMidiFileName: ${loadedMidiFileName}`);
  }, [playbackState, loadedMidiFileName]);

  // Filter MIDI files based on selected genre
  const filteredMidiFiles = useMemo(() => {
    if (!selectedMidiGenre) {
      return availableMidiFiles.filter(file => file.genre === (midiGenres[0] || '')); // Default to first genre if none selected
    }
    return availableMidiFiles.filter(file => file.genre === selectedMidiGenre);
  }, [availableMidiFiles, selectedMidiGenre, midiGenres]);

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

  // Event Handlers using MUI structure (value comes from event.target.value)
  const handleMuiSelectChange = (handler) => (event) => {
     handler(event.target.value);
  };
  
  const handleMuiCheckboxChange = (handler) => (event) => {
      handler(event.target.checked);
  };

  // *** Log the received isMidiInitialized prop ***
  console.log('[Controls.jsx] Received isMidiInitialized prop:', isMidiInitialized);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', p: 2, mb: 2, borderRadius: 1 }}> 
      <Typography variant="h6" gutterBottom>Controls</Typography>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTabIndex} onChange={handleTabChange} aria-label="Control tabs">
          {TABS.map((tab, index) => (
            <Tab label={tab.label} key={tab.id} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content Panels */}
      {/* === Setup Tab Panel === */}
      <TabPanel value={activeTabIndex} index={0}>
        <Stack spacing={2}> {/* Use Stack for vertical spacing */}
            {/* --- Mode Selection --- */}
             <FormControl fullWidth>
               <InputLabel id="mode-select-label">Mode</InputLabel>
               <Select
                 labelId="mode-select-label"
                 id="mode-select"
                 value={currentMode}
                 label="Mode"
                 onChange={handleMuiSelectChange(onModeChange)}
               >
                 {modes && modes.map(mode => (
                   <MenuItem key={mode.value} value={mode.value}>{mode.label}</MenuItem>
                 ))}
               </Select>
             </FormControl>

            {/* --- Root & Scale Selection --- */}
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 120 }}>
                 <InputLabel id="root-select-label">Root</InputLabel>
                 <Select
                   labelId="root-select-label"
                   value={selectedRootNote}
                   label="Root"
                   onChange={handleMuiSelectChange(onRootChange)}
                 >
                   {Array.isArray(rootNotes) && rootNotes.map(note => (
                     <MenuItem key={note} value={note}>{note}</MenuItem>
                   ))}
                 </Select>
               </FormControl>
               <FormControl sx={{ minWidth: 100 }}>
                 <InputLabel id="octave-select-label">Octave</InputLabel>
                 <Select
                    labelId="octave-select-label"
                    value={selectedOctave}
                    label="Octave"
                    onChange={handleMuiSelectChange(onOctaveChange)}
                 >
                   {Array.isArray(octaves) && octaves.map(oct => (
                     <MenuItem key={oct} value={oct}>{oct}</MenuItem>
                   ))}
                 </Select>
               </FormControl>
            </Stack>
            <FormControl fullWidth>
               <InputLabel id="scale-select-label">Scale</InputLabel>
               <Select
                    labelId="scale-select-label"
                    value={selectedScaleType}
                    label="Scale"
                    onChange={handleMuiSelectChange(onScaleChange)}
               >
                  {Array.isArray(scaleTypes) && scaleTypes.map(scale => (
                    <MenuItem key={scale} value={scale}>{scale}</MenuItem>
                  ))}
                </Select>
            </FormControl>

            {/* --- Chord Search (Conditional) --- */}
            {currentMode === 'chord_search' && (
              <Box sx={{ pl: 2, borderLeft: 3, borderColor: 'grey.300' }}>
                <FormControl fullWidth>
                   <InputLabel id="chord-type-label">Chord Type</InputLabel>
                   <Select
                      labelId="chord-type-label"
                      value={selectedChordType}
                      label="Chord Type"
                      onChange={handleMuiSelectChange(onChordChange)}
                   >
                      {Array.isArray(chordTypes) && chordTypes.map(chord => (
                       <MenuItem key={chord} value={chord}>{chord}</MenuItem>
                      ))}
                   </Select>
                 </FormControl>
               </Box>
            )}

            {/* --- Chord Progression Selection (Conditional) --- */}
            {currentMode === 'chord_progression' && (
              <Box sx={{ pl: 2, borderLeft: 3, borderColor: 'secondary.light' }}>
                 <FormControl fullWidth>
                    <InputLabel id="progression-select-label">Progression</InputLabel>
                    <Select 
                      labelId="progression-select-label"
                      id="progression-select" 
                      value={selectedProgressionId || ''} 
                      label="Progression"
                      onChange={handleMuiSelectChange(onProgressionChange)}
                    >
                      {/* Consider adding a "None" or default option */}
                      {/* <MenuItem value=""><em>-- Select Progression --</em></MenuItem> */}
                      {availableProgressions.map(prog => (
                       <MenuItem key={prog.id} value={prog.id}>{prog.name}</MenuItem>
                      ))}
                    </Select>
                 </FormControl>
              </Box>
            )}

            {/* --- Voicing Options (Duplicate for Chord Progression Mode) --- */}
            {currentMode === 'chord_progression' && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: 3, borderColor: 'primary.light' }}>
                <Typography variant="subtitle1" gutterBottom>Progression Voicing</Typography>
                <FormGroup>
                  <FormControlLabel 
                    control={<Checkbox checked={showSevenths} onChange={handleMuiCheckboxChange(onShowSeventhsChange)} />} 
                    label="Show 7ths" 
                  />
                   <FormControlLabel 
                    control={<Checkbox checked={voicingSplitHand} onChange={handleMuiCheckboxChange(onVoicingSplitHandChange)} />} 
                    label="Split Hand (LH Bass)" 
                  />
                  {voicingSplitHand && ( // Only show offset if split hand is active
                     <FormControl sx={{ mt: 1, minWidth: 120 }}>
                       <InputLabel id="lh-offset-label">LH Offset</InputLabel>
                       <Select
                         labelId="lh-offset-label"
                         value={voicingLhOctaveOffset}
                         label="LH Offset"
                         onChange={handleMuiSelectChange(onVoicingLhOffsetChange)}
                         size="small" // Make it smaller
                       >
                         {[-2, -1, 0].map(offset => (
                           <MenuItem key={offset} value={offset}>{offset === 0 ? 'None' : `${offset} Octave${offset === -1 ? '' : 's'}`}</MenuItem>
                         ))}
                       </Select>
                     </FormControl>
                  )}
                   <FormControlLabel 
                    control={<Checkbox checked={voicingRhRootless} onChange={handleMuiCheckboxChange(onVoicingRhRootlessChange)} />} 
                    label="RH Rootless" 
                  />
                   <FormControlLabel 
                    control={<Checkbox checked={voicingUseShell} onChange={handleMuiCheckboxChange(onVoicingUseShellChange)} />} 
                    label="Use Shell Voicing (3/7)" 
                  />
                   <FormControlLabel 
                    control={<Checkbox checked={voicingAddOctaveRoot} onChange={handleMuiCheckboxChange(onVoicingAddOctaveRootChange)} />} 
                    label="Add Octave Root (RH)" 
                  />
                    {/* RH Inversion Dropdown */}
                  <FormControl sx={{ mt: 1, minWidth: 150 }}>
                     <InputLabel id="rh-inversion-prog-label">RH Inversion</InputLabel>
                     <Select
                        labelId="rh-inversion-prog-label"
                        value={rhInversion}
                        label="RH Inversion"
                        onChange={handleMuiSelectChange(onRhInversionChange)}
                        size="small"
                     >
                       {inversions && inversions.map((inv, index) => (
                         <MenuItem key={index} value={index}>{inv.label}</MenuItem>
                       ))}
                     </Select>
                  </FormControl>
                </FormGroup>
              </Box>
            )}
            
            {/* --- Diatonic Chord Mode Options (Conditional) --- */}
            {currentMode === 'diatonic_chords' && (
               <Box sx={{ mt: 2, pl: 2, borderLeft: 3, borderColor: 'success.light' }}>
                <Typography variant="subtitle1" gutterBottom>Diatonic Options</Typography>
                 {/* Diatonic Chord Buttons */}
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {(showSevenths ? diatonicSevenths : diatonicTriads).map((chordName, index) => (
                        <Button
                            key={index}
                            variant={selectedDiatonicDegree === (index + 1) ? 'contained' : 'outlined'}
                            // Add color based on quality? - Example, needs refinement
                            // color={getChordQuality(chordName) === 'minor' ? 'secondary' : 'primary'} 
                            onClick={() => onDiatonicDegreeChange(index + 1)}
                            size="small"
                            sx={{ textTransform: 'none' }} // Prevent uppercase
                        >
                            {getRomanNumeral(index)} ({chordName || 'N/A'})
                        </Button>
                    ))}
                 </Box>
                 {/* Diatonic Voicing Options */}
                <FormGroup>
                   <FormControlLabel 
                      control={<Checkbox checked={showSevenths} onChange={handleMuiCheckboxChange(onShowSeventhsChange)} />} 
                      label="Show 7ths" 
                    />
                   <FormControlLabel 
                      control={<Checkbox checked={splitHandVoicing} onChange={handleMuiCheckboxChange(onSplitHandVoicingChange)} />} 
                      label="Split Hand (LH Root + RH Chord)" 
                    />
                     {/* RH Inversion Dropdown */}
                    <FormControl sx={{ mt: 1, minWidth: 150 }}>
                       <InputLabel id="rh-inversion-diatonic-label">RH Inversion</InputLabel>
                       <Select
                          labelId="rh-inversion-diatonic-label"
                          value={rhInversion}
                          label="RH Inversion"
                          onChange={handleMuiSelectChange(onRhInversionChange)}
                          size="small"
                       >
                         {inversions && inversions.map((inv, index) => (
                           <MenuItem key={index} value={index}>{inv.label}</MenuItem>
                         ))}
                       </Select>
                    </FormControl>
                     {/* Split Hand Interval (If we keep this specific one) */}
                    {splitHandVoicing && (
                      <FormControl sx={{ mt: 1, minWidth: 150 }}>
                         <InputLabel id="split-interval-label">Split Interval</InputLabel>
                         <Select
                            labelId="split-interval-label"
                            value={splitHandInterval}
                            label="Split Interval"
                            onChange={handleMuiSelectChange(onSplitHandIntervalChange)}
                            size="small"
                         >
                           {[-2, -1, 0, 1, 2].map(interval => ( // Example intervals
                              <MenuItem key={interval} value={interval}>
                                 {interval === 0 ? 'Unison' : interval > 0 ? `+${interval} Oct` : `${interval} Oct`}
                              </MenuItem>
                            ))}
                         </Select>
                      </FormControl>
                    )}
                 </FormGroup>
              </Box>
            )}

            <Divider sx={{ my: 2 }} /> {/* Separator */}

            {/* --- MIDI Device Selection --- */}
            <Typography variant="subtitle1" gutterBottom>MIDI Devices</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}> {/* Responsive row/column */}
                <FormControl fullWidth>
                    <InputLabel id="midi-input-label">MIDI Input</InputLabel>
                    <Select
                        labelId="midi-input-label"
                        value={selectedInputId || ''}
                        label="MIDI Input"
                        onChange={(e) => {
                            console.log('[Controls.jsx] MIDI Input onChange fired! Value:', e.target.value);
                            onSelectInput(e.target.value);
                        }}
                        disabled={!isMidiInitialized}
                    >
                        <MenuItem value=""><em>-- Select Input --</em></MenuItem>
                        {midiInputs.map(input => (
                            <MenuItem key={input.id} value={input.id}>{input.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <InputLabel id="midi-output-label">MIDI Output</InputLabel>
                    <Select
                        labelId="midi-output-label"
                        value={selectedOutputId || ''}
                        label="MIDI Output"
                        onChange={(e) => {
                            console.log('[Controls.jsx] MIDI Output onChange fired! Value:', e.target.value);
                            onSelectOutput(e.target.value);
                        }}
                        disabled={!isMidiInitialized}
                    >
                         <MenuItem value=""><em>-- Select Output --</em></MenuItem>
                        {midiOutputs.map(output => (
                            <MenuItem key={output.id} value={output.id}>{output.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>
            {!isMidiInitialized && <Typography variant="caption" color="text.secondary">Initializing MIDI...</Typography>}
        </Stack>
      </TabPanel>

      {/* === Metronome Tab Panel === */}
      <TabPanel value={activeTabIndex} index={1}>
         <Stack spacing={2}>
            <Typography variant="subtitle1" gutterBottom>Metronome Settings</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button 
                variant="contained" 
                onClick={onToggleMetronome}
              >
                {isMetronomePlaying ? 'Stop' : 'Start'} Metronome
              </Button>
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel id="metronome-bpm-label">BPM</InputLabel>
                <Select
                  labelId="metronome-bpm-label"
                  value={metronomeBpm}
                  label="BPM"
                  onChange={handleMuiSelectChange(onChangeMetronomeTempo)}
                  size="small"
                >
                 {/* Generate BPM options */}
                 {Array.from({ length: (220 - 40) / 4 + 1 }, (_, i) => 40 + i * 4).map(bpm => (
                    <MenuItem key={bpm} value={bpm}>{bpm}</MenuItem>
                  ))}
                </Select>
              </FormControl>
             <FormControl sx={{ minWidth: 120 }}>
                <InputLabel id="metronome-ts-label">Time Sig</InputLabel>
                <Select
                  labelId="metronome-ts-label"
                  value={metronomeTimeSignature}
                  label="Time Sig"
                  onChange={handleMuiSelectChange(onChangeMetronomeTimeSignature)}
                   size="small"
               >
                  {['4/4', '3/4', '2/4', '6/8'].map(ts => ( // Example time signatures
                    <MenuItem key={ts} value={ts}>{ts}</MenuItem>
                  ))}
                </Select>
              </FormControl>
               <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="metronome-sound-label">Sound</InputLabel>
                <Select
                  labelId="metronome-sound-label"
                  value={metronomeSoundNote}
                  label="Sound"
                  onChange={handleMuiSelectChange(onChangeMetronomeSound)}
                   size="small"
               >
                  {Array.isArray(metronomeSounds) && metronomeSounds.map(sound => ( 
                    <MenuItem key={sound.note} value={sound.note}>{sound.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
         </Stack>
      </TabPanel>

      {/* === Backing Track Tab Panel === */}
      <TabPanel value={activeTabIndex} index={2}>
         <Stack spacing={2}>
            <Typography variant="subtitle1" gutterBottom>Backing Track Player</Typography>
             <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
               {/* Genre Selection */}
               <FormControl fullWidth>
                  <InputLabel id="midi-genre-select-label">Genre</InputLabel>
                  <Select
                     labelId="midi-genre-select-label"
                     id="midi-genre-select"
                     value={selectedMidiGenre || ''}
                     label="Genre"
                     onChange={handleMuiSelectChange(onMidiGenreChange)}
                  >
                     {/* <MenuItem value=""><em>-- Select Genre --</em></MenuItem> */}
                     {midiGenres.map(genre => (
                       <MenuItem key={genre} value={genre}>{genre}</MenuItem>
                     ))}
                  </Select>
               </FormControl>
                {/* File Selection (depends on Genre) */}
               <FormControl fullWidth disabled={!selectedMidiGenre}>
                  <InputLabel id="midi-file-select-label">Track</InputLabel>
                  <Select
                     labelId="midi-file-select-label"
                     id="midi-file-select"
                     value={loadedMidiFileName ? filteredMidiFiles.find(f=>f.name === loadedMidiFileName)?.url : ''} // Select based on URL mapped from loaded name
                     label="Track"
                     onChange={(e) => onLoadMidiFile(e.target.value)} // Pass URL directly
                  >
                      <MenuItem value=""><em>-- Select Track --</em></MenuItem>
                     {filteredMidiFiles.map(file => (
                       <MenuItem key={file.url} value={file.url}>{file.name}</MenuItem>
                     ))}
                  </Select>
               </FormControl>
            </Stack>
            {/* Playback Controls */}
            <Stack direction="row" spacing={1} alignItems="center">
               <Button variant="contained" onClick={onPlayMidiFile} disabled={playbackState === 'playing' || !loadedMidiFileName}>Play</Button>
               <Button variant="outlined" onClick={onPauseMidiFile} disabled={playbackState !== 'playing'}>Pause</Button>
               <Button variant="outlined" color="secondary" onClick={onStopMidiFile} disabled={playbackState === 'stopped'}>Stop</Button>
               {loadedMidiFileName && <Typography variant="body2" sx={{ ml: 2 }}>Loaded: {loadedMidiFileName}</Typography>}
            </Stack>
              <Typography variant="caption">Status: {playbackState}</Typography>
          </Stack>
      </TabPanel>

      {/* === GM2 Sounds Tab Panel === */}
      <TabPanel value={activeTabIndex} index={3}>
          <Typography variant="subtitle1" gutterBottom>GM2 Sound Selection</Typography>
           {/* Ensure sendMessage is passed */}
           <Gm2SoundSelector sendMessage={sendMessage} /> 
      </TabPanel>

    </Box>
  );
}

export default Controls; 