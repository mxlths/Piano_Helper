import React, { useState, useCallback, useEffect, useRef } from 'react';
import Player from 'midi-player-js';
import Piano from './components/Piano';
import ChordDisplay from './components/ChordDisplay';
import Controls from './components/Controls';
import MidiDeviceSelector from './components/MidiDeviceSelector';
import LogDisplay from './components/LogDisplay';
import DrillSettings from './components/DrillSettings';
import { useMidi } from './hooks/useMidi';
import { useMetronome } from './hooks/useMetronome';
import MusicLogic from './musicLogic';
import ChordSearch from './components/ChordSearch';
import DrillDisplay from './components/DrillDisplay';
import { Scales } from './constants/Scales';
import { GM2_DRUM_KITS, DEFAULT_DRUM_KIT_NAME } from './utils/midiConstants'; // Import drum kits
import { selectDrumKit } from './utils/midiPlaybackUtils'; // Import selection function

import './App.css';

function App() {
    const [displayMode, setDisplayMode] = useState('Piano'); // 'Piano', 'ChordSearch', 'Drill'
    const [selectedRoot, setSelectedRoot] = useState('C');
    const [selectedScale, setSelectedScale] = useState('Major');
    const [highlightMode, setHighlightMode] = useState('scale'); // 'scale', 'chord', 'note'
    const [highlightedKeys, setHighlightedKeys] = useState(new Set());
    const [activeDrill, setActiveDrill] = useState(null); // Holds the current drill steps
    const [drillStepIndex, setDrillStepIndex] = useState(0);
    const [drillSettings, setDrillSettings] = useState({
        octaves: 1,          // Number of octaves to drill
        repetitions: 1,      // Number of times to repeat each chord/note in the drill
        randomize: false,    // Whether to randomize the drill steps
        drillType: 'diatonicChords' // 'diatonicChords', 'scaleNotes', etc.
    });
    const [selectedDrumKitName, setSelectedDrumKitName] = useState(DEFAULT_DRUM_KIT_NAME); // State for drum kit
    const [isMidiPlaying, setIsMidiPlaying] = useState(false); // State for playback status

    // Ref to hold the MIDI Player instance
    const midiPlayerRef = useRef(null);

    // Instantiate MusicLogic
    const [musicLogic] = useState(() => new MusicLogic());

    // Use MIDI hook
    const {
        isInitialized,
        inputs,
        outputs,
        selectedInputId,
        selectedOutputId,
        logMessages,
        selectInput,
        selectOutput,
        sendMessage,
        lastMidiMessage,
        latestNoteOn, // For drill trigger
        activeNotes,
        log // Destructure log if available, otherwise handle it below
    } = useMidi();

    // Create a stable log function reference if not provided by useMidi
    const stableLog = useCallback(logMessages => {
        // Check if the log function is provided by useMidi hook
        if (typeof log === 'function') {
            log(logMessages);
        } else {
            // Fallback or alternative logging if necessary
            console.log("Log (App):", logMessages); 
        }
    }, [log]); // Depend on log from useMidi

    // Use Metronome hook, passing the sendMessage function from useMidi
    const {
        isMetronomePlaying,
        startMetronome,
        stopMetronome,
        bpm,
        setBpm,
        timeSignature,
        setTimeSignature,
        selectedSoundNote,
        setSelectedSoundNote,
        metronomeSounds
    } = useMetronome(sendMessage);

    // --- Callbacks for Controls --- 
    const handleRootChange = (newRoot) => {
        setSelectedRoot(newRoot);
        updateHighlightedKeys(newRoot, selectedScale, highlightMode, null, drillSettings, activeDrill, drillStepIndex);
    };

    const handleScaleChange = (newScale) => {
        setSelectedScale(newScale);
        updateHighlightedKeys(selectedRoot, newScale, highlightMode, null, drillSettings, activeDrill, drillStepIndex);
    };

    const handleHighlightModeChange = (newMode) => {
        setHighlightMode(newMode);
        updateHighlightedKeys(selectedRoot, selectedScale, newMode, null, drillSettings, activeDrill, drillStepIndex);
    };

    const handleDrillSettingsChange = (newSettings) => {
        console.log("App: Handling Drill Settings Change:", newSettings);
        setDrillSettings(prev => ({ ...prev, ...newSettings }));
        // Re-generate drill and update highlights immediately if settings change
        // Consider if we should only regenerate on explicit start/restart
        const newDrill = generateDrillSteps(selectedRoot, selectedScale, { ...drillSettings, ...newSettings });
        setActiveDrill(newDrill);
        setDrillStepIndex(0);
        updateHighlightedKeys(selectedRoot, selectedScale, 'drill', null, { ...drillSettings, ...newSettings }, newDrill, 0);

    };

    // --- Drum Kit Selection Handler ---
    const handleDrumKitChange = (event) => {
        const newKitName = event.target.value;
        setSelectedDrumKitName(newKitName);
        // Optionally, send MIDI messages immediately on change if needed?
        // Or just store it and use it before playback starts.
        console.log(`Drum Kit selected: ${newKitName}`);
        // Example: If you wanted to immediately select it:
        // if (selectedOutputId) {
        //     selectDrumKit(newKitName, sendMessage, log); // Assuming log is available from useMidi
        // }
    };

    // --- Drill Logic ---
    const generateDrillSteps = useCallback((root, scale, settings) => {
        console.log("generateDrillSteps called with settings:", settings);
        let steps = [];
        const scaleInfo = Scales[scale];
        if (!scaleInfo) return [];

        const intervals = scaleInfo.intervals;
        const mode = scaleInfo.mode;

        switch (settings.drillType) {
            case 'diatonicChords':
                steps = musicLogic.generateDiatonicChordDrill(root, intervals, mode, settings.octaves, settings.repetitions);
                break;
            case 'scaleNotes':
                // Placeholder for scale note drill generation
                steps = musicLogic.generateScaleNoteDrill(root, intervals, settings.octaves, settings.repetitions);
                break;
            // Add other drill types here
            default:
                steps = [];
        }

        if (settings.randomize && steps.length > 0) {
            // Simple Fisher-Yates shuffle
            for (let i = steps.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [steps[i], steps[j]] = [steps[j], steps[i]];
            }
        }
        console.log("Generated drill steps:", steps);
        return steps;
    }, [musicLogic]); // musicLogic is stable

    const startDrill = useCallback(() => {
        console.log("Starting drill with settings:", drillSettings);
        const newDrill = generateDrillSteps(selectedRoot, selectedScale, drillSettings);
        if (newDrill && newDrill.length > 0) {
            setActiveDrill(newDrill);
            setDrillStepIndex(0);
            setDisplayMode('Drill');
            setHighlightMode('drill'); // Switch highlight mode for the drill
            updateHighlightedKeys(selectedRoot, selectedScale, 'drill', null, drillSettings, newDrill, 0);
        } else {
            console.warn("Could not generate drill steps.");
            setActiveDrill(null);
            // Optionally provide feedback to the user
        }
    }, [selectedRoot, selectedScale, drillSettings, generateDrillSteps]);

    const stopDrill = useCallback(() => {
        setActiveDrill(null);
        setDrillStepIndex(0);
        setDisplayMode('Piano'); // Revert to Piano view
        setHighlightMode('scale'); // Revert to default highlight
        updateHighlightedKeys(selectedRoot, selectedScale, 'scale');
    }, [selectedRoot, selectedScale]);

    // Effect to handle drill advancement based on MIDI input
    useEffect(() => {
        if (!activeDrill || drillStepIndex >= activeDrill.length || !latestNoteOn || displayMode !== 'Drill') {
            return;
        }

        const currentStep = activeDrill[drillStepIndex];
        const expectedNoteNumbers = currentStep.notes.map(note => musicLogic.noteToMidi(note));

        // Simple check: if the latest note on is part of the expected notes for the current step
        // More robust logic might check if *all* expected notes are currently held (using activeNotes)
        // Check if *all* currently active notes match the *exact* expected notes
        const activeNoteNumbers = new Set(activeNotes.map(noteName => musicLogic.noteToMidi(noteName)));
        const expectedNoteNumbersSet = new Set(expectedNoteNumbers);

        const notesMatch = activeNoteNumbers.size === expectedNoteNumbersSet.size &&
                         [...activeNoteNumbers].every(noteNum => expectedNoteNumbersSet.has(noteNum));


        // if (expectedNoteNumbersSet.has(latestNoteOn.note.number)) {
        if (notesMatch) {
            console.log(`Drill step ${drillStepIndex} CORRECT! Expected: ${currentStep.name}, Notes: ${currentStep.notes.join(', ')}. Input matches.`);
            // Move to the next step
            const nextIndex = drillStepIndex + 1;
            if (nextIndex < activeDrill.length) {
                setDrillStepIndex(nextIndex);
                // Update highlights for the new step
                updateHighlightedKeys(selectedRoot, selectedScale, 'drill', null, drillSettings, activeDrill, nextIndex);
            } else {
                console.log("Drill finished!");
                stopDrill(); // Or show a completion message
            }
        }
    // }, [activeDrill, drillStepIndex, latestNoteOn, musicLogic, stopDrill, selectedRoot, selectedScale, drillSettings]);
}, [activeDrill, drillStepIndex, activeNotes, musicLogic, stopDrill, selectedRoot, selectedScale, drillSettings]); // Depend on activeNotes instead of latestNoteOn



    // --- Key Highlighting Logic ---
    const updateHighlightedKeys = useCallback((root, scale, mode, chordName = null, currentDrillSettings = drillSettings, currentDrill = activeDrill, currentDrillIndex = drillStepIndex) => {
        let keysToHighlight = new Set();
        try {
            if (mode === 'scale') {
                const scaleNotes = musicLogic.getScaleNotes(root, scale);
                scaleNotes.forEach(note => keysToHighlight.add(musicLogic.noteToMidi(note)));
            } else if (mode === 'chord' && chordName) {
                // Allow specifying octave or default to 4 if not present in chordName?
                const chordNotes = musicLogic.getChordNotes(chordName);
                chordNotes.forEach(note => keysToHighlight.add(musicLogic.noteToMidi(note)));
            } else if (mode === 'drill' && currentDrill && currentDrill.length > currentDrillIndex) {
                const currentStep = currentDrill[currentDrillIndex];
                if (currentStep && currentStep.notes) {
                    currentStep.notes.forEach(note => {
                         // Get MIDI number without forcing octave 4, use the octave from the note string
                        keysToHighlight.add(musicLogic.noteToMidi(note)); 
                    });
                }
            }
            // Handle 'note' mode or default case if needed
        } catch (error) {
            console.error("Error updating highlighted keys:", error);
        }
        setHighlightedKeys(keysToHighlight);
    }, [musicLogic, drillSettings, activeDrill, drillStepIndex]); // Dependencies

    // Initial highlight update
    useEffect(() => {
        updateHighlightedKeys(selectedRoot, selectedScale, highlightMode);
    }, [selectedRoot, selectedScale, highlightMode, updateHighlightedKeys]); // Re-run if mode changes

    // --- MIDI File Playback ---

    // Function to handle sending MIDI events from the player
    const handleMidiPlayerEvent = useCallback((event) => {
        if (!sendMessage) return;
        // event structure from midi-player-js: { noteNumber, velocity, byte1, byte2, status, ... }

        let statusByte = event.status;
        let dataBytes = [];

        // midi-player-js provides status, byte1, byte2
        if (event.byte1 !== undefined) dataBytes.push(event.byte1);
        if (event.byte2 !== undefined) dataBytes.push(event.byte2);

        // Reconstruct the status byte if only command/channel is given (might not be needed)
        if (event.command && event.channel) {
            statusByte = (event.command << 4) | (event.channel - 1); // Ensure channel is 0-indexed
        }

        if (statusByte !== undefined) {
            // Only send if we have a valid status byte
            // Skip potentially problematic messages if needed (e.g., SysEx if not enabled)
            if (statusByte >= 0xF0 && statusByte <= 0xF7) { 
                 stableLog('Skipping System Common/Realtime message from MIDI file.', 'DEBUG');
                 return;
             }
            sendMessage(statusByte, dataBytes);
            // Optional: More detailed logging
            // const dataBytesHex = dataBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
            // stableLog(`MIDI Playback -> Status: 0x${statusByte.toString(16)}, Data: [${dataBytesHex}]`, 'DEBUG');
        } else {
            stableLog('MIDI Playback -> Received event without status byte:', 'WARN', event);
        }

    }, [sendMessage, stableLog]);

    // Initialize or get the player instance
    const getPlayer = useCallback(() => {
        if (!midiPlayerRef.current) {
            stableLog('Initializing MIDI Player...');
            midiPlayerRef.current = new Player(handleMidiPlayerEvent);
            // Add other listeners if needed (e.g., 'endOfFile')
            midiPlayerRef.current.on('endOfFile', () => {
                stableLog('MIDI file playback finished.');
                setIsMidiPlaying(false);
            });
        }
        return midiPlayerRef.current;
    }, [handleMidiPlayerEvent, stableLog]);

    const loadAndPlayFile = useCallback(async (filePath) => {
        if (!selectedOutputId) {
            stableLog("Cannot play MIDI file: No output selected.", 'WARN');
            return;
        }

        const player = getPlayer();
        if (player.isPlaying()) {
            player.stop();
            setIsMidiPlaying(false);
            stableLog('Stopped previous MIDI playback.');
            // Send All Notes Off / Reset Controllers?
             const allNotesOffCC = 123;
             const resetControllersCC = 121;
             for (let ch = 0; ch < 16; ch++) {
                 sendMessage(0xB0 | ch, [allNotesOffCC, 0]);
                 // sendMessage(0xB0 | ch, [resetControllersCC, 0]); // Optional
             }
        }

        try {
            stableLog(`Fetching MIDI file: ${filePath}...`);
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            stableLog('MIDI file fetched, loading into player...');

            // Select the drum kit *before* loading/playing
            selectDrumKit(selectedDrumKitName, sendMessage, stableLog);

            player.loadArrayBuffer(arrayBuffer);
            stableLog('MIDI file loaded. Starting playback...');
            player.play();
            setIsMidiPlaying(true);

        } catch (error) {
            stableLog(`Error loading or playing MIDI file ${filePath}: ${error.message}`, 'ERROR');
            setIsMidiPlaying(false);
        }
    }, [getPlayer, selectedOutputId, sendMessage, selectedDrumKitName, stableLog]); // Added stableLog dependency

    const stopMidiFile = useCallback(() => {
        const player = midiPlayerRef.current;
        if (player && player.isPlaying()) {
            player.stop();
            stableLog('MIDI playback stopped by user.');
            setIsMidiPlaying(false);
             // Send All Notes Off / Reset Controllers
             const allNotesOffCC = 123;
             const resetControllersCC = 121;
             for (let ch = 0; ch < 16; ch++) {
                 sendMessage(0xB0 | ch, [allNotesOffCC, 0]);
                 // sendMessage(0xB0 | ch, [resetControllersCC, 0]); // Optional
             }
        }
    }, [sendMessage, stableLog]); // Added stableLog

    // Cleanup player on unmount or output change
    useEffect(() => {
        const player = midiPlayerRef.current;
        // Return cleanup function
        return () => {
            if (player) {
                stableLog('Cleaning up MIDI player...');
                if (player.isPlaying()) {
                    player.stop();
                }
                // Remove specific listeners if added
                // player.off('midiEvent', handleMidiPlayerEvent); // Requires storing the listener differently
                // player.off('endOfFile', ... );
                midiPlayerRef.current = null; // Help garbage collection
            }
        };
    }, []); // Run only on mount/unmount

     // Stop playback if output device is deselected
     useEffect(() => {
         if (!selectedOutputId && midiPlayerRef.current && midiPlayerRef.current.isPlaying()) {
             stableLog('MIDI Output deselected, stopping playback.', 'WARN');
             stopMidiFile();
         }
     }, [selectedOutputId, stopMidiFile]);

    // --- UI Rendering ---
    return (
        <div className="App">
            <h1>Piano Helper</h1>
            <div className="main-container">
                <div className="left-panel">
                    <MidiDeviceSelector
                        inputs={inputs}
                        outputs={outputs}
                        selectedInputId={selectedInputId}
                        selectedOutputId={selectedOutputId}
                        onSelectInput={selectInput}
                        onSelectOutput={selectOutput}
                        isInitialized={isInitialized}
                    />

                     {/* Drum Kit Selector */}
                     <div className="control-group">
                        <label htmlFor="drum-kit-select">Drum Kit:</label>
                        <select
                            id="drum-kit-select"
                            value={selectedDrumKitName}
                            onChange={handleDrumKitChange}
                            disabled={!selectedOutputId || isMidiPlaying} // Disable during playback
                        >
                            {Object.keys(GM2_DRUM_KITS).map(kitName => (
                                <option key={kitName} value={kitName}>
                                    {kitName}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* End Drum Kit Selector */}

                    {/* <Controls
                        selectedRoot={selectedRoot}
                        selectedScale={selectedScale}
                        highlightMode={highlightMode}
                        onRootChange={handleRootChange}
                        onScaleChange={handleScaleChange}
                        onHighlightModeChange={handleHighlightModeChange}
                        isMetronomePlaying={isMetronomePlaying}
                        startMetronome={startMetronome}
                        stopMetronome={stopMetronome}
                        bpm={bpm}
                        onBpmChange={setBpm}
                        timeSignature={timeSignature}
                        onTimeSignatureChange={setTimeSignature}
                        selectedSoundNote={selectedSoundNote}
                        onSoundNoteChange={setSelectedSoundNote}
                        metronomeSounds={metronomeSounds}
                    /> */}

                    <h4>[TESTING HEADING AFTER CONTROLS]</h4>

                    {/* MIDI Playback Controls - THIS SECTION */}
                     <div className="control-group midi-playback-controls">
                         <h4>Backing Track</h4>
                         <button 
                            onClick={() => loadAndPlayFile('/midi-files/JBB_4-4_NmlMedSwg_T076_FullKit_108.mid')}
                            disabled={!selectedOutputId || isMidiPlaying}
                         >
                             Play Example Track
                         </button>
                         <button onClick={stopMidiFile} disabled={!isMidiPlaying}>
                             Stop Track
                         </button>
                         <span>{isMidiPlaying ? 'Playing...' : 'Stopped'}</span>
                      </div>
                      {/* End MIDI Playback Controls */}
                    <DrillSettings settings={drillSettings} onChange={handleDrillSettingsChange} onStartDrill={startDrill} />
                     <button onClick={() => setDisplayMode('Piano')} disabled={displayMode === 'Piano'}>Show Piano</button>
                     <button onClick={() => setDisplayMode('ChordSearch')} disabled={displayMode === 'ChordSearch'}>Show Chord Search</button>
                     {/* <button onClick={startDrill} disabled={displayMode === 'Drill'}>Start Drill</button> */}

                </div>

                <div className="right-panel">
                    {displayMode === 'Piano' && (
                        <Piano highlightedKeys={highlightedKeys} activeNotes={activeNotes} />
                    )}
                    {displayMode === 'ChordSearch' && (
                        <ChordSearch musicLogic={musicLogic} onChordSelect={(chordName) => {
                            setHighlightMode('chord');
                            updateHighlightedKeys(selectedRoot, selectedScale, 'chord', chordName);
                        }} />
                    )}
                    {displayMode === 'Drill' && (
                        <>
                            <DrillDisplay drill={activeDrill} currentStepIndex={drillStepIndex} />
                            <Piano highlightedKeys={highlightedKeys} activeNotes={activeNotes} />
                            <button onClick={stopDrill}>Stop Drill</button>
                        </>
                    )}
                     {/* Only show ChordDisplay when highlightMode is 'chord'? */}
                     {highlightMode === 'chord' && <ChordDisplay />} 
                </div>
            </div>
            <LogDisplay logMessages={logMessages} />
        </div>
    );
}

export default App; 