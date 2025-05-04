import { useState, useEffect, useCallback, useRef } from 'react';
// Try default import for webmidi v2.x
import WebMidi from 'webmidi'; 
import MusicLogic from '../musicLogic'; // Import for note name conversion

// Instantiate the logic class once - consider moving if hook is used multiple times
// For now, it's okay here as App uses the hook once.
const musicLogic = new MusicLogic(); 

/**
 * Custom Hook to manage WebMIDI API interactions.
 */
function useMidi() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [inputs, setInputs] = useState([]); // Array of { id, name } for inputs
  const [outputs, setOutputs] = useState([]); // Array of { id, name } for outputs
  const [selectedInputId, setSelectedInputId] = useState(null);
  const [selectedOutputId, setSelectedOutputId] = useState(null);
  const [logMessages, setLogMessages] = useState(['MIDI Hook Initialized...']); // State for logs
  
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
      setIsInitialized(false); // Mark as not initializable
      return; // Stop initialization
    }

    if (!isInitialized) {
      log('Attempting to enable WebMidi (sysex: true)...');
      WebMidi.enable((err) => {
        if (err) {
          log(`WebMidi.enable() failed: ${err.message}`, 'ERROR');
          alert(`Failed to initialize MIDI: ${err.message}. Please ensure permissions are granted.`);
          setIsInitialized(false); // Ensure state reflects failure
        } else {
          log('WebMidi enabled successfully.');
          setIsInitialized(true);
          updateDeviceLists(); // Update lists immediately after enable
        }
      }, { sysex: true }); // Changed to true
    }
  }, [isInitialized, log, updateDeviceLists]); // Depend on isInitialized to prevent re-running if already enabled

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
    if (isInitialized && WebMidi.enabled) { 
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

        // Cleanup listeners on component unmount or when isInitialized changes
        return () => {
            log('Removing WebMidi connected/disconnected listeners...');
            // Check if WebMidi is still enabled before trying to remove listeners
            // This might prevent errors if disable() was called externally or during unmount
            if (WebMidi.enabled) { 
                WebMidi.removeListener('connected', handleDeviceChange);
                WebMidi.removeListener('disconnected', handleDeviceChange);
            }
        };
    } else if (isInitialized && !WebMidi.enabled) {
        // Log if we intended to add listeners but couldn't because WebMidi was disabled
        log('Skipping adding listeners because WebMidi is not enabled (isInitialized is true).', 'WARN');
    }
  }, [isInitialized, log, updateDeviceLists]); // Re-run if initialization status changes

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
        } else if (command === 8 || (command === 9 && data2 === 0)) {
            const noteName = musicLogic.midiToNoteName(data1);
            messageString = `Note Off (Ch ${channel}): ${noteName} Vel: ${data2}`;
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

  }, [log]); // Depends on log function

  // --- Device Selection --- 
  const selectInput = useCallback((id) => {
    if (id === selectedInputId) return;

    // Remove listener from previous input
    if (selectedInputRef.current) {
      log(`Removing listener from previous input: ${selectedInputRef.current.name}`);
      selectedInputRef.current.removeListener('midimessage', 'all', handleIncomingMidiMessage);
      selectedInputRef.current = null;
    }

    setSelectedInputId(id);

    // Add listener to new input
    if (id) {
      // Log available inputs right before trying to get by ID
      const availableInputIds = WebMidi.inputs ? WebMidi.inputs.map(i => i.id) : [];
      log(`Trying to find input ID: ${id}. Available input IDs: [${availableInputIds.join(', ')}]`);
      
      // Simplify: ONLY use .find() to locate the device
      let inputDevice = null;
      if (WebMidi.inputs && WebMidi.inputs.length > 0) {
          log(`Attempting to find input via WebMidi.inputs.find() comparing as strings...`);
          // Force comparison as strings to avoid potential type issues
          const targetIdString = String(id);
          inputDevice = WebMidi.inputs.find(input => String(input.id) === targetIdString);
      }

      if (inputDevice) {
        log(`Found device immediately via .find(): ${inputDevice.name} (ID: ${inputDevice.id})`);
        log(`Adding listener to new input: ${inputDevice.name}`);
        inputDevice.addListener('midimessage', 'all', handleIncomingMidiMessage);
        selectedInputRef.current = inputDevice; // Store reference
      } else {
        // If find failed
        log(`Could not find input device with ID: ${id} using .find().`, 'ERROR');
      }
    } else {
        log("Input deselected.");
    }
  }, [log, selectedInputId, handleIncomingMidiMessage]); // Dependencies

  const selectOutput = useCallback((id) => {
    // Convert the id (which is likely a string from <select>) to a number
    const numericId = id !== null ? Number(id) : null;

    if (numericId === selectedOutputId) return;

    log(`Selecting output: ${numericId !== null ? numericId : 'None'}`);
    // Store the ID as a number
    setSelectedOutputId(numericId);
  }, [log, selectedOutputId]);

  // --- Message Sending ---
  const sendMessage = useCallback((data) => {
    if (selectedOutputId === null) { // Check for null explicitly
        log("Cannot send MIDI message: No output selected.", 'WARN');
        return;
    }

    // Attempt to find the output device manually using .find()
    const outputDevice = WebMidi.outputs.find(output => output.id === selectedOutputId);

    // --- DEBUG LOGS REMOVED ---
    
    if (outputDevice) { // Check if the .find() method returned a device object
      try {
        // Log MIDI Out data in a more readable format if possible (e.g., hex)
        const dataHex = Array.from(data).map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        log(`MIDI Out: [${dataHex}] to ${outputDevice.name}`); // Log raw data being sent
        outputDevice.send(data);
      } catch (error) {
        log(`Error sending MIDI message: ${error.message}`, 'ERROR');
      }
    } else {
        // Log if .find() failed
        const availableOutputIDs = WebMidi.outputs ? WebMidi.outputs.map(o => `ID: ${o.id} Name: ${o.name}`) : ['None available'];
        log(`[sendMessage] .find() failed to locate output device ID: ${selectedOutputId}`, 'WARN');
        log(`[sendMessage] Available outputs: [${availableOutputIDs.join(', ')}]`, 'WARN');
    }
  }, [log, selectedOutputId]);

  // Return state and functions needed by components
  return {
    isInitialized,
    inputs,
    outputs,
    selectedInputId,
    selectedOutputId,
    logMessages,
    selectInput,
    selectOutput,
    sendMessage,
  };
}

export default useMidi; 