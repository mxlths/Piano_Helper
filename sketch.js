// Global variables for modules (placeholders for now)
let uiManager;
let musicLogic;
let displayManager;
let metronomeEngine;
let trackPlayer;
let midiHandler;

// Global variable for the application state
let appState;

// UI Element References
let startButton, tempoInput, accentSelect; // Metronome controls
let midiMonitorDiv; // MIDI Monitor Display
let midiInputSelect, midiOutputSelect; // Device selectors
let midiRefreshButton; // Refresh button

// MIDI Log State
const MAX_MIDI_LOG_LINES = 15; 
let midiLogMessages = []; 

// Make setup async to await MIDI initialization
async function setup() { 
    console.log("Setting up Piano Helper...");
    let canvasWidth = 720;
    let canvasHeight = 220; 
    let cnv = createCanvas(canvasWidth, canvasHeight);
    cnv.parent('canvas-container'); 

    // Define appState *before* using it to initialize modules
    appState = {
        currentMode: 'scale_display',
        selectedRoot: 'C4',
        selectedScaleType: 'major',
        selectedChordType: null,
        displayKeyboardRange: { startMidi: 48, endMidi: 72 }, // C3 to C5
        currentScaleNotes: [], // Will be populated below
        currentChordNotes: [],
        metronome: { 
            isPlaying: false, 
            bpm: 120, 
            timeSignature: { beats: 4, division: 4 }, // Keep for potential future use?
            accentType: '4/4' // Default accent
        },
        selectedTrack: null,
        trackPlayerState: 'stopped',
        midiInputDevice: null,
        midiOutputDevice: null,
        rootMidi: null, 
    };

    // Initialize Modules
    musicLogic = new MusicLogic();
    displayManager = new DisplayManager();
    const initialScaleData = musicLogic.getScale(appState.selectedRoot, appState.selectedScaleType);
    appState.currentScaleNotes = initialScaleData ? initialScaleData.notes : [];
    appState.rootMidi = initialScaleData ? initialScaleData.rootMidi : null;
    midiHandler = new MidiHandler();
    metronomeEngine = new MetronomeEngine(
        appState.metronome.bpm, 
        4, // initialBeats (not really used now)
        appState.metronome.accentType,
        midiHandler // Pass the handler instance
    );
    // trackPlayer = new TrackPlayer();
    // uiManager = new UIManager();

    // Initialize MIDI
    await midiHandler.initialize(); 

    // Initialize UI (including MIDI selectors now that devices are known)
    initializeUI();

    console.log("Setup complete.");
}

function draw() {
    background(220); // Clear background each frame

    // Main Render Loop - Driven by DisplayManager
    if (displayManager && appState) {
        let notesToDraw = appState.currentMode === 'scale_display' ? appState.currentScaleNotes : appState.currentChordNotes;
        let rootNote = musicLogic.noteNameToMidi(appState.selectedRoot); // Get current root MIDI

        displayManager.drawKeyboard(notesToDraw, rootNote, appState.displayKeyboardRange);
       // displayManager.drawInfoText(getInfoText()); // We are using HTML for info text for now
    }

    // Placeholder drawing - REMOVED
    /*
    fill(0);
    textAlign(CENTER, CENTER);
    text("Piano Keyboard Placeholder", width / 2, height / 2);
    text(`Mode: ${appState.currentMode}`, width / 2, height / 2 + 20);
    text(`Scale: ${appState.selectedRoot} ${appState.selectedScaleType}`, width / 2, height / 2 + 40);
    */

    // Update Engines (if needed in draw loop, or handle via events/callbacks)
    // MetronomeEngine now uses setInterval, so no update needed in draw
    // if (metronomeEngine) {
    //     metronomeEngine.update(); 
    // }
}

function initializeUI() {
    const controlsDiv = select('#controls');
    controlsDiv.html(''); 

    // --- Metronome Controls --- 
    // Start/Stop Button
    startButton = createButton('Start Metronome');
    startButton.parent(controlsDiv);
    startButton.mousePressed(toggleMetronome);
    startButton.style('margin-right', '20px'); 

    // Tempo Input
    let tempoLabel = createSpan('Tempo (BPM):');
    tempoLabel.parent(controlsDiv);
    tempoInput = createInput(appState.metronome.bpm.toString(), 'number');
    tempoInput.parent(controlsDiv);
    tempoInput.attribute('min', '30'); 
    tempoInput.attribute('max', '300');
    tempoInput.style('width', '60px');
    tempoInput.input(updateTempo); 

     // Accent/Time Signature Select
    let accentLabel = createSpan('Accent:');
    accentLabel.parent(controlsDiv);
    accentLabel.style('margin-left', '20px');
    accentSelect = createSelect();
    accentSelect.parent(controlsDiv);
    accentSelect.option('none');
    accentSelect.option('4/4');
    accentSelect.option('3/4');
    accentSelect.selected(appState.metronome.accentType); 
    accentSelect.changed(updateAccent);

    // --- MIDI Device Selectors --- 
    createMidiDeviceSelectors(controlsDiv); // Create the initial dropdowns

    // --- MIDI Refresh Button (for debugging iOS/WebMIDI Browser) ---
    midiRefreshButton = createButton('Refresh MIDI Lists');
    midiRefreshButton.parent(controlsDiv);
    midiRefreshButton.style('margin-left', '20px');
    midiRefreshButton.mousePressed(refreshMidiDeviceSelectorsUI);

    // --- MIDI Monitor --- 
    midiMonitorDiv = select('#midi-monitor');
    midiMonitorDiv.html('Waiting for MIDI...<br>'); 

    // --- Other UI (Info Display) --- 
    updateInfoDisplay(); 

    console.log("UI Initialized"); 
}

// --- Metronome Control Callbacks --- 
function toggleMetronome() {
    if (!metronomeEngine) return;

    if (metronomeEngine.getIsPlaying()) {
        metronomeEngine.stop();
        startButton.html('Start Metronome'); // Update button text
    } else {
        // Important: p5 requires user interaction to start audio context
        // We ensure this in metronomeEngine.start() via userStartAudio()
        metronomeEngine.start();
        startButton.html('Stop Metronome'); // Update button text
    }
}

function updateTempo() {
    if (!metronomeEngine || !tempoInput) return;
    const newBpm = parseInt(tempoInput.value(), 10);
    if (!isNaN(newBpm) && newBpm > 0) {
        appState.metronome.bpm = newBpm; // Update appState
        metronomeEngine.setTempo(newBpm);
    }
}

function updateAccent() {
    if (!metronomeEngine || !accentSelect) return;
    const newAccentType = accentSelect.value();
    appState.metronome.accentType = newAccentType; // Update appState
    metronomeEngine.setAccentType(newAccentType);
    // Update the display if needed (e.g., if time sig was shown)
}

// --- MIDI Device UI --- 
function createMidiDeviceSelectors(parentDiv) {
    if (!midiHandler) return;

    // Clean up previous elements if they exist (needed for refresh)
    if (midiInputSelect) midiInputSelect.remove();
    if (midiOutputSelect) midiOutputSelect.remove();
    // TODO: Ideally, remove the labels too, requires storing references
    parentDiv.elt.querySelectorAll('.midi-device-label').forEach(el => el.remove());

    // Input Selector
    let inputLabel = createSpan('MIDI Input:');
    inputLabel.addClass('midi-device-label'); // Add class for easier removal
    inputLabel.parent(parentDiv);
    inputLabel.style('margin-left', '20px');
    midiInputSelect = createSelect();
    midiInputSelect.parent(parentDiv);
    midiInputSelect.option('-- Select Input --', ''); 
    const inputs = midiHandler.getInputDevices();
    inputs.forEach(input => {
        midiInputSelect.option(input.name, input.id);
    });
    midiInputSelect.changed(handleMidiInputChange);
    // Restore selection if possible
    if (appState.midiInputDevice) {
        midiInputSelect.selected(appState.midiInputDevice);
    }

    // Output Selector
    let outputLabel = createSpan('MIDI Output:');
    outputLabel.addClass('midi-device-label'); // Add class for easier removal
    outputLabel.parent(parentDiv);
    outputLabel.style('margin-left', '20px');
    midiOutputSelect = createSelect();
    midiOutputSelect.parent(parentDiv);
    midiOutputSelect.option('-- Select Output --', ''); 
    const outputs = midiHandler.getOutputDevices();
    outputs.forEach(output => {
        midiOutputSelect.option(output.name, output.id);
    });
    midiOutputSelect.changed(handleMidiOutputChange);
    // Restore selection if possible
    if (appState.midiOutputDevice) {
        midiOutputSelect.selected(appState.midiOutputDevice);
    }
}

function handleMidiInputChange() {
    if (!midiHandler || !midiInputSelect) return;
    const selectedId = midiInputSelect.value();
    appState.midiInputDevice = selectedId || null;
    // Pass the function that handles incoming messages
    midiHandler.selectInput(selectedId || null, handleIncomingMidi); 
}

function handleMidiOutputChange() {
    if (!midiHandler || !midiOutputSelect) return;
    const selectedId = midiOutputSelect.value();
    appState.midiOutputDevice = selectedId || null;
    midiHandler.selectOutput(selectedId || null);
    // TODO: Potentially update metronome to use MIDI out if selected?
}

// Function called by the refresh button
function refreshMidiDeviceSelectorsUI() {
    console.log("Manually refreshing MIDI device selectors UI...");
    const controlsDiv = select('#controls'); 
    if (controlsDiv) {
        createMidiDeviceSelectors(controlsDiv); // Recreate the selectors
    } else {
        console.error("Could not find controls div for MIDI refresh.");
    }
}

// --- MIDI Message Logging --- 
/**
 * Handles raw incoming MIDI data, formats it, and logs it.
 * @param {Uint8Array} data - Raw MIDI message data.
 */
function handleIncomingMidi(data) {
    if (!data || data.length === 0) {
        console.log("handleIncomingMidi called with empty data.");
        return;
    };

    // Log the raw data received
    const rawBytesString = Array.from(data).map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    console.log(`--- MIDI Received Raw: ${rawBytesString} ---`);

    const statusByte = data[0];
    const command = statusByte >> 4; // Get the command nybble
    const channel = statusByte & 0xf;  // Get the channel nybble
    const data1 = data.length > 1 ? data[1] : null; // Note or Controller Number
    const data2 = data.length > 2 ? data[2] : 0;    // Velocity or Controller Value

    console.log(`Parsed -> Status: 0x${statusByte.toString(16)}, Command: ${command}, Channel: ${channel}, Data1: ${data1}, Data2: ${data2}`);

    let messageString = '';

    try { // Add try-catch for safety during parsing
        // Note On (Command 9) - velocity > 0
        if (command === 9 && data2 > 0) {
            console.log("Branch: Note On");
            const noteName = musicLogic ? musicLogic.midiToNoteName(data1) : `Note ${data1}`;
            messageString = `Note On  (Ch ${channel}): ${noteName} Vel: ${data2}`;
        }
        // Note Off (Command 8 or Command 9 with velocity 0)
        else if (command === 8 || (command === 9 && data2 === 0)) {
            console.log("Branch: Note Off");
            const noteName = musicLogic ? musicLogic.midiToNoteName(data1) : `Note ${data1}`;
            messageString = `Note Off (Ch ${channel}): ${noteName} Vel: ${data2}`;
        }
        // Control Change (Command B = 11 decimal)
        else if (command === 11) { 
            console.log("Branch: Control Change");
            messageString = `CC       (Ch ${channel}): Ctrl ${data1} Val: ${data2}`;
        } 
        // Pitch Bend (Command E = 14 decimal)
        else if (command === 14) {
            console.log("Branch: Pitch Bend");
            const pitchValue = (data2 << 7) | data1; // LSB is data1, MSB is data2
            messageString = `Pitch Bend (Ch ${channel}): Val ${pitchValue}`;
        }
        // Polyphonic Aftertouch / Key Pressure (Command A = 10 decimal)
        else if (command === 10) { 
            console.log("Branch: Poly Aftertouch");
            const noteName = musicLogic ? musicLogic.midiToNoteName(data1) : `Note ${data1}`;
            const pressureValue = data2;
            messageString = `Poly AT  (Ch ${channel}): ${noteName} Pressure: ${pressureValue}`;
        }
        // Channel Pressure / Channel Aftertouch (Command D = 13 decimal)
        else if (command === 13) { 
            console.log("Branch: Channel Aftertouch");
            const pressureValue = data1; // Only one data byte for channel pressure
            messageString = `Channel AT (Ch ${channel}): Pressure: ${pressureValue}`;
        }
        // Other common messages can be added here (Program Change, etc.)
        else {
            console.log("Branch: Fallback to RAW");
            messageString = `[RAW] ${rawBytesString}`;
        }
    } catch (e) {
        console.error("Error during MIDI parsing logic:", e);
        messageString = `[ERROR PARSING] ${rawBytesString}`;
    }

    logMidiMessage(messageString);
}

/**
 * Logs a formatted MIDI message string to the monitor div.
 * @param {string} messageString - The formatted MIDI message string.
 */
function logMidiMessage(messageString) {
    if (!midiMonitorDiv) return;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logEntry = `${timestamp}: ${messageString}`; 

    midiLogMessages.push(logEntry);

    if (midiLogMessages.length > MAX_MIDI_LOG_LINES) {
        midiLogMessages.shift(); 
    }

    midiMonitorDiv.html(midiLogMessages.join('<br>'));
    midiMonitorDiv.elt.scrollTop = midiMonitorDiv.elt.scrollHeight;
}

// --- Helper function to update info display --- 
function updateInfoDisplay() {
    const infoDiv = select('#info-display');
    if (!musicLogic || !appState) {
        infoDiv.html('Loading...');
        return;
    }

    let info = {};
    if (appState.currentMode === 'scale_display' && appState.selectedRoot && appState.selectedScaleType) {
        const scaleData = musicLogic.getScale(appState.selectedRoot, appState.selectedScaleType);
        if (scaleData) {
            info.title = scaleData.name;
            info.formula = `Formula: ${scaleData.formula}`;
            info.notes = `Notes (MIDI): ${scaleData.notes.join(', ')}`;
            // Convert MIDI notes to names for display
            info.noteNames = `Notes: ${scaleData.notes.map(n => musicLogic.midiToNoteName(n)).join(', ')}`;
        }
    } else if (appState.currentMode === 'chord_display' && appState.selectedRoot && appState.selectedChordType) {
         const chordData = musicLogic.getChord(appState.selectedRoot, appState.selectedChordType);
         if (chordData) {
            // Update rootMidi in appState if needed when switching to chord display
            appState.rootMidi = chordData.rootMidi; 
            info.title = chordData.name;
            info.formula = `Formula: ${chordData.formula}`;
            info.notes = `Notes (MIDI): ${chordData.notes.join(', ')}`;
            // Convert MIDI notes to names for display
            info.noteNames = `Notes: ${chordData.notes.map(n => musicLogic.midiToNoteName(n)).join(', ')}`;
        }
    }

    // Display the gathered info
    infoDiv.html(`
        <h3>${info.title || 'Select...'}</h3>
        <p>${info.noteNames || ''}</p>
        <p>${info.formula || ''}</p>
        <p><small>${info.notes || ''}</small></p>
    `); // Ensure the backtick terminates the literal
}

// Add other event handlers like mousePressed, keyPressed etc. as needed
// ...