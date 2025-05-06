import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// Try default import for webmidi v2.x
import WebMidi from 'webmidi'; 
import MusicLogic from '../musicLogic'; // Import for note name conversion

// Instantiate the logic class once - consider moving if hook is used multiple times
// For now, it's okay here as App uses the hook once.
const musicLogic = new MusicLogic(); 

/**
 * Custom Hook to manage WebMIDI API interactions.
 * Accepts callbacks for noteon and noteoff events.
 */
function useMidi({ onNoteOn, onNoteOff, onInitialized }) { // <-- Accept callbacks as props
  const [inputs, setInputs] = useState([]); // Array of { id, name } for inputs
  const [outputs, setOutputs] = useState([]); // Array of { id, name } for outputs
  const [selectedInputId, setSelectedInputId] = useState(null);
  const [selectedOutputId, setSelectedOutputId] = useState(null);
  const [logMessages, setLogMessages] = useState(['MIDI Hook Initialized...']); // State for logs
  const [lastMidiMessage, setLastMidiMessage] = useState(null); // <-- Keep for potential future use
  // REMOVED internal state for latestMidiEvent and activeNotes
  // const [latestMidiEvent, setLatestMidiEvent] = useState(null);
  // const [activeNotes, setActiveNotes] = useState(new Set()); 
  // REMOVED activeNotesArray = useMemo(...)

  // Ref to store the currently selected WebMidi Input object
  const selectedInputRef = useRef(null); 

  // Internal logger function
  const log = useCallback((message, level = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    let prefix = '';
    if (level === 'WARN') prefix = '[WARN] ';
    else if (level === 'ERROR') prefix = '[ERR] ';
    console.log(`${level}: ${message}`); // Also log to console for dev
    setLogMessages(prev => [
        ...prev.slice(-29), // Keep last ~30 messages
        `${timestamp}: ${prefix}${message}`
    ]);
  }, []);

  // Function to update device lists based on WebMidi state
  const updateDeviceLists = useCallback(() => {
    log('Updating device lists...');
    if (!WebMidi.enabled) {
        log('WebMidi not enabled, cannot update lists.', 'WARN');
        setInputs([]);
        setOutputs([]);
        return;
    }
    const currentInputs = WebMidi.inputs.map(i => ({ id: i.id, name: i.name }));
    const currentOutputs = WebMidi.outputs.map(o => ({ id: o.id, name: o.name }));
    setInputs(currentInputs);
    setOutputs(currentOutputs);
    log(`Found ${currentInputs.length} inputs, ${currentOutputs.length} outputs.`);
    // Check if selected input disconnected
    if (selectedInputId && !currentInputs.find(i => i.id === selectedInputId)) {
        log(`Selected input ${selectedInputId} disconnected. Deselecting.`, 'WARN');
        selectInput(null); // Call selectInput to handle deselection logic
    }
    // Check if selected output disconnected
    if (selectedOutputId && !currentOutputs.find(o => o.id === selectedOutputId)) {
        log(`Selected output ${selectedOutputId} disconnected. Deselecting.`, 'WARN');
        selectOutput(null); // Call selectOutput to handle deselection logic
    }
  }, [log]);

  // Effect for initializing WebMidi
  useEffect(() => {
    // Check if WebMidi is supported by the browser *before* trying to enable
    log(`Checking WebMidi.supported: ${WebMidi.supported}`);
    if (!WebMidi.supported) {
      log('Web MIDI API is not supported in this browser.', 'ERROR');
      alert('Web MIDI API is not supported in this browser environment.');
      // REMOVED: setIsInitialized(false); // Mark as not initializable
      return; // Stop initialization
    }

    log('Attempting to enable WebMidi (sysex: true)...');
    WebMidi.enable((err) => {
      if (err) {
        log(`WebMidi.enable() failed: ${err.message}`, 'ERROR');
        alert(`Failed to initialize MIDI: ${err.message}. Please ensure permissions are granted.`);
        // REMOVED: setIsInitialized(false); // Ensure state reflects failure
      } else {
        log('WebMidi enabled successfully.');
        // Fetch devices immediately
        const currentInputs = WebMidi.inputs.map(i => ({ id: i.id, name: i.name }));
        const currentOutputs = WebMidi.outputs.map(o => ({ id: o.id, name: o.name }));
        // Update internal state (might still be useful for the hook itself)
        setInputs(currentInputs);
        setOutputs(currentOutputs);
        log(`Found ${currentInputs.length} inputs, ${currentOutputs.length} outputs.`);
        
        // Call the callback with the lists
        if (typeof onInitialized === 'function') {
          console.log('[useMidi.js] Value of currentInputs before callback:', currentInputs);
          console.log('[useMidi.js] Value of currentOutputs before callback:', currentOutputs);          
          onInitialized(currentInputs, currentOutputs); // Pass lists
          console.log('[useMidi.js] onInitialized(inputs, outputs) CALLED'); 
        }
        // REMOVED updateDeviceLists(); // No longer needed here as we pass lists directly
      }
    }, { sysex: true }); // Changed to true
  }, [log, onInitialized]); // Depend on onInitialized to prevent re-running if already enabled

  // NEW Effect for cleanup on unmount only
  useEffect(() => {
    // Return the cleanup function
    return () => {
      if (WebMidi.enabled) {
        log('Disabling WebMidi on component unmount...');
        WebMidi.disable();
        // setIsInitialized(false); // Avoid setting state during unmount cleanup
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and cleans up on unmount

  // Effect for handling device connection/disconnection listeners
  useEffect(() => {
    // Add check for WebMidi.enabled *inside* the effect
    // This handles cases where WebMidi might be disabled between renders (e.g., by StrictMode)
    if (/* REMOVED: isInitialized && */ WebMidi.enabled) { // Only check if WebMidi is enabled now
        const handleDeviceChange = (e) => {
            let portIsValid = typeof e.port === 'object' && e.port !== null && e.port.id !== undefined;

            if (portIsValid) {
                // Log the raw port object via the on-screen logger
                try {
                    log(`Device ${e.type}: Port Object: ${JSON.stringify(e.port)}`); 
                } catch (error) {
                     log(`Device ${e.type}: Port Object could not be stringified.`, 'WARN');
                }
                // Original log kept for context
                log(`Device ${e.type}: ${e.port?.name || 'undefined'} (${e.port?.type || 'undefined'})`); 
            } else {
                // Log that the received port object was invalid
                log(`Device ${e.type}: Received invalid Port data in event: ${JSON.stringify(e.port)}`, 'WARN');
            }

            // Update lists: Immediately for disconnect, slightly delayed for connect
            if (e.type === 'disconnected') {
                 log(`Updating lists immediately for disconnect.`);
                 updateDeviceLists();
            } else if (e.type === 'connected') {
                 log(`Delaying list update slightly for connect (50ms)...`);
                 setTimeout(updateDeviceLists, 50); // 50ms delay
            } else {
                 // Fallback for unknown event types?
                 log(`Updating lists for unknown event type: ${e.type}`);
                 updateDeviceLists();
            }
        };

        log('Adding WebMidi connected/disconnected listeners...');
        // It should be safe to add listeners now because we checked WebMidi.enabled
        WebMidi.addListener('connected', handleDeviceChange);
        WebMidi.addListener('disconnected', handleDeviceChange);

        // Cleanup listeners on component unmount or when onInitialized changes
        return () => {
            log('Removing WebMidi connected/disconnected listeners...');
            // Check if WebMidi is still enabled before trying to remove listeners
            // This might prevent errors if disable() was called externally or during unmount
            if (WebMidi.enabled) { 
                WebMidi.removeListener('connected', handleDeviceChange);
                WebMidi.removeListener('disconnected', handleDeviceChange);
            }
        };
    } else if (/* REMOVED: isInitialized && */ !WebMidi.enabled) {
        // Log if we intended to add listeners but couldn't because WebMidi was disabled
        log('Skipping adding listeners because WebMidi is not enabled.', 'WARN'); // Removed onInitialized check mention
    }
  }, [log, updateDeviceLists]); // Re-run if onInitialized status changes

  // --- Incoming Message Handler ---
  const handleIncomingMidiMessage = useCallback((event) => {
    const data = event.data; // Uint8Array
    if (!data || data.length === 0) return;

    const rawBytesString = Array.from(data).map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    
    const statusByte = data[0];
    const command = statusByte >> 4;
    const channel = statusByte & 0xf;
    const data1 = data.length > 1 ? data[1] : null;
    const data2 = data.length > 2 ? data[2] : 0;

    let messageString = '';
    try {
        if (command === 9 && data2 > 0) {
            const noteName = musicLogic.midiToNoteName(data1);
            messageString = `Note On  (Ch ${channel}): ${noteName} Vel: ${data2}`;
            // REMOVED setLatestMidiEvent
            // REMOVED setActiveNotes
            // Call the onNoteOn callback prop instead
            if (typeof onNoteOn === 'function') {
                onNoteOn({ note: data1, velocity: data2, type: 'noteon', timestamp: Date.now() });
            }
        } else if (command === 8 || (command === 9 && data2 === 0)) { // Note Off
            const noteName = musicLogic.midiToNoteName(data1);
            messageString = `Note Off (Ch ${channel}): ${noteName} Vel: ${data2}`;
            // REMOVED setLatestMidiEvent
            // REMOVED setActiveNotes
            // Call the onNoteOff callback prop instead
             if (typeof onNoteOff === 'function') {
                onNoteOff({ note: data1, velocity: data2, type: 'noteoff', timestamp: Date.now() });
             }
        } else if (command === 11) {
            messageString = `CC       (Ch ${channel}): Ctrl ${data1} Val: ${data2}`;
        } else if (command === 14) {
            const pitchValue = (data2 << 7) | data1;
            messageString = `Pitch Bend (Ch ${channel}): Val ${pitchValue}`;
        } else if (command === 10) {
            const noteName = musicLogic.midiToNoteName(data1);
            messageString = `Poly AT  (Ch ${channel}): ${noteName} Pressure: ${data2}`;
        } else if (command === 13) {
             messageString = `Channel AT (Ch ${channel}): Pressure: ${data1}`;
        } else if (statusByte === 0xF8) { // Timing Clock
            messageString = `Timing Clock (0xF8)`;
             // Optionally filter these out from the log
             // return;
        } else if (statusByte === 0xFA) { // Start
            messageString = `Start (0xFA)`;
        } else if (statusByte === 0xFC) { // Stop
            messageString = `Stop (0xFC)`;
        } else if (statusByte === 0xFE) { // Active Sensing
             messageString = `Active Sensing (0xFE)`;
             // Optionally filter these out
             // return;
        } else {
            messageString = `[RAW] ${rawBytesString}`;
        }
    } catch (e) {
        log(`Error parsing MIDI: ${e.message}`, 'ERROR');
        messageString = `[PARSE ERROR] ${rawBytesString}`;
    }

    log(`MIDI In: ${messageString}`); // Log the parsed message

    setLastMidiMessage(event); // <-- Store last message regardless of type initially

    // Optional: Log specific event types if needed for debugging
    // if (event.type === 'noteon' || event.type === 'noteoff') {
    //     console.log(`MIDI ${event.type}: Note=${event.note.identifier}, Vel=${event.velocity}, Chan=${event.channel}`);
    // }
  }, [log, onNoteOn, onNoteOff]); // Add callbacks to dependency array

  // --- Device Selection --- 
  const selectInput = useCallback((newId) => {
    log(`selectInput called with: ${newId} (type: ${typeof newId})`); // <-- Log input
    const idToSet = newId === "" ? null : newId;
    log(`selectInput: Current state is ${selectedInputId}, trying to set to ${idToSet}`); // <-- Log state comparison

    if (idToSet === selectedInputId) {
      log('selectInput: New ID is same as current state. Skipping update.');
      return; 
    }

    // Remove listener from previous input
    if (selectedInputRef.current) {
      log(`Removing listener from previous input: ${selectedInputRef.current.name}`);
      selectedInputRef.current.removeListener('midimessage'); // Remove ALL listeners for this event
      selectedInputRef.current = null;
    }

    log(`selectInput: Setting state to: ${idToSet}`); // <-- Log before state set
    setSelectedInputId(idToSet); // Update state with ID or null

    // Add listener to new input if an ID is provided
    if (idToSet && WebMidi.enabled) {
      const input = WebMidi.getInputById(idToSet);
      if (input) {
        log(`Adding listener to input: ${input.name}`);
        input.addListener('midimessage', handleIncomingMidiMessage); // Listen on all channels
        selectedInputRef.current = input; // Store ref to new input
      } else {
        log(`Could not find input with ID: ${idToSet}`, 'ERROR');
      }
    }
  }, [log, handleIncomingMidiMessage, selectedInputId]);

  const selectOutput = useCallback((newId) => {
    log(`selectOutput called with: ${newId} (type: ${typeof newId})`); // <-- Log input
    const idToSet = newId === "" ? null : newId;
    log(`selectOutput: Current state is ${selectedOutputId}, trying to set to ${idToSet}`); // <-- Log state comparison

    if (idToSet === selectedOutputId) {
       log('selectOutput: New ID is same as current state. Skipping update.');
       return;
    }

    log(`selectOutput: Setting state to: ${idToSet}`); // <-- Log before state set
    setSelectedOutputId(idToSet); // Update state with ID or null
    
  }, [log, selectedOutputId]);

  // --- Sending Messages --- 
  const sendMessage = useCallback((command, data1 = null, data2 = null, channel = 'all') => {
    if (!selectedOutputId) {
      // log('Cannot send MIDI message: No output selected.', 'WARN');
      // Silence this warning as it's logged frequently by metronome/player
      return;
    }
    if (!WebMidi.enabled) {
        log('Cannot send MIDI message: WebMidi not enabled.', 'WARN');
        return;
    }
    const output = WebMidi.getOutputById(selectedOutputId);
    if (!output) {
      log(`Cannot send MIDI message: Output ${selectedOutputId} not found.`, 'ERROR');
      return;
    }

    try {
      let statusByte;
      const message = [];

      // Determine status byte based on command type
      if (typeof command === 'number' && command >= 0x80 && command <= 0xEF) {
          statusByte = command; // Command is already a status byte (e.g., 0x90 for Note On)
      } else if (typeof command === 'string') {
          switch (command.toLowerCase()) {
              case 'noteon': statusByte = 0x90; break;
              case 'noteoff': statusByte = 0x80; break;
              case 'controlchange':
              case 'cc': statusByte = 0xB0; break;
              case 'programchange':
              case 'pc': statusByte = 0xC0; break;
              // Add other command strings as needed (pitchbend, etc.)
              default: throw new Error(`Unknown MIDI command string: ${command}`);
          }
      } else {
          throw new Error(`Invalid MIDI command type: ${typeof command}`);
      }
      
      // For channel messages, status byte includes channel (0-15)
      // We will handle sending to specific/all channels later
      // For now, assume we might modify status byte if channel is specified

      // Build message array
      // message.push(statusByte); // We'll let webmidi.js handle combining status+channel
      if (data1 !== null) message.push(data1);
      if (data2 !== null) message.push(data2);

      // Simple logging
       let logMsg = `MIDI Out: Cmd=${command}, Ch=${channel}, D1=${data1}, D2=${data2} -> ${output.name}`;
      // If it's PC or CC, log more descriptive info
      if (statusByte === 0xC0) logMsg = `MIDI Out: PC Ch ${channel}, Program ${data1} -> ${output.name}`;
      if (statusByte === 0xB0) logMsg = `MIDI Out: CC Ch ${channel}, Ctrl ${data1}, Val ${data2} -> ${output.name}`;
      if (statusByte === 0x90) logMsg = `MIDI Out: NoteOn Ch ${channel}, Note ${data1}, Vel ${data2} -> ${output.name}`;
      if (statusByte === 0x80) logMsg = `MIDI Out: NoteOff Ch ${channel}, Note ${data1}, Vel ${data2} -> ${output.name}`;
      log(logMsg); 

      // Send using WebMidi.js methods which handle command strings/numbers and channels
      if (command === 'noteon' || statusByte === 0x90) {
          output.playNote(data1, channel, { rawVelocity: true, velocity: data2 });
      } else if (command === 'noteoff' || statusByte === 0x80) {
          output.stopNote(data1, channel, { rawVelocity: true, velocity: data2 });
      } else if (command === 'controlchange' || command === 'cc' || statusByte === 0xB0) {
          output.sendControlChange(data1, data2, channel);
      } else if (command === 'programchange' || command === 'pc' || statusByte === 0xC0) {
          // Program change only uses data1
          output.sendProgramChange(data1, channel); 
      } else {
           // Fallback for other commands? Maybe send raw bytes?
           log(`Sending raw bytes for command ${command}: ${[statusByte, ...message]}`, 'WARN');
           output.send(statusByte, message, undefined, {channels: channel}); // Assuming send handles array
      }

    } catch (error) {
      log(`Error sending MIDI message: ${error.message}`, 'ERROR');
    }
  }, [selectedOutputId, log]); // Depend on selected output and log function

  // Return hook state and functions
  return {
    // REMOVED: isInitialized, // Use this name externally
    inputs,        // Use this name externally
    outputs,       // Use this name externally
    selectedInputId,
    selectedOutputId,
    logMessages,
    lastMidiMessage,
    selectInput,   // Use this name externally
    selectOutput,  // Use this name externally
    sendMessage,   // Use this name externally
  };
}

export default useMidi; 