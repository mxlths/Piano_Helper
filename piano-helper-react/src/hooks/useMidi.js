import { useState, useEffect, useCallback } from 'react';
import { WebMidi } from 'webmidi'; // Import the library

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
    // TODO: Check if selected device disconnected
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
      log('Attempting to enable WebMidi (sysex: false)...');
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
      }, { sysex: false }); // Start with sysex: false for broader compatibility
    }
    // Cleanup function (optional, but good practice)
    // return () => {
    //   if (WebMidi.enabled) {
    //     log('Disabling WebMidi...');
    //     WebMidi.disable();
    //     setIsInitialized(false);
    //   }
    // };
  }, [isInitialized, log, updateDeviceLists]); // Depend on isInitialized to prevent re-running if already enabled

  // Effect for handling device connection/disconnection listeners
  useEffect(() => {
    if (isInitialized) {
        const handleDeviceChange = (e) => {
            log(`Device ${e.type}: ${e.port.name} (${e.port.type})`);
            updateDeviceLists();
        };

        log('Adding WebMidi connected/disconnected listeners...');
        WebMidi.addListener('connected', handleDeviceChange);
        WebMidi.addListener('disconnected', handleDeviceChange);

        // Cleanup listeners on component unmount or when isInitialized changes
        return () => {
            log('Removing WebMidi connected/disconnected listeners...');
            WebMidi.removeListener('connected', handleDeviceChange);
            WebMidi.removeListener('disconnected', handleDeviceChange);
        };
    } 
  }, [isInitialized, log, updateDeviceLists]); // Re-run if initialization status changes

  // --- Device Selection --- 
  const selectInput = useCallback((id) => {
    // Check if selection actually changed
    if (id === selectedInputId) return;

    log(`Selecting input: ${id || 'None'}`);
    // TODO: Detach listener from previous input if selectedInputId was not null
    setSelectedInputId(id);
    // TODO: Attach listener to new input if id is not null
  }, [log, selectedInputId]); // Add selectedInputId to dependency array

  const selectOutput = useCallback((id) => {
    // Check if selection actually changed
    if (id === selectedOutputId) return;

    log(`Selecting output: ${id || 'None'}`);
    // TODO: Get the WebMidi Output object and store it maybe?
    setSelectedOutputId(id);
  }, [log, selectedOutputId]); // Add selectedOutputId to dependency array

  // --- Message Sending --- (Placeholder)
  const sendMessage = useCallback((data) => {
    log(`Attempting to send message: ${data}`);
    // TODO: Add logic to send message via selectedOutput
  }, [log/*, selectedOutputId */]); // Dependency will change

  // --- Incoming Message Handling --- (Placeholder)
  // TODO: Need to manage the listener added in selectInput


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