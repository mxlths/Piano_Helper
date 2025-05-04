class MidiHandler {
    constructor(logFunction) {
        this.midiAccess = null; // Stores the result of requestMIDIAccess
        this.inputs = [];       // Array of available MIDIInput objects
        this.outputs = [];      // Array of available MIDIOutput objects
        this.selectedInputId = null;
        this.selectedOutputId = null;
        this.selectedInput = null;  // The actual MIDIInput object
        this.selectedOutput = null; // The actual MIDIOutput object

        this.onMessageCallback = null; // Function to call when a MIDI message arrives
        this.onDevicesUpdatedCallback = null; // ADDED: Callback for UI refresh

        // Store the passed-in logger function
        this.logger = typeof logFunction === 'function' ? logFunction : console.log; 

        this.logger("MidiHandler module initialized");
    }

    /**
     * Initializes the Web MIDI API access.
     * @param {function} devicesUpdatedCallback - Function to call when device list might have changed.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async initialize(devicesUpdatedCallback) {
        this.logger("MidiHandler: initialize() called."); // Use logger
        if (!navigator.requestMIDIAccess) {
            this.logger("Web MIDI API is not supported in this browser.", 'ERROR'); // Use logger
            alert("Web MIDI API is not supported in this browser.");
            return false;
        }
        this.onDevicesUpdatedCallback = devicesUpdatedCallback;
        this.logger("MidiHandler: Stored devicesUpdatedCallback."); // Use logger

        try {
            this.logger("MidiHandler: Requesting MIDI access with sysex: true..."); // Use logger
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
            this.logger("MidiHandler: MIDI Access Granted object received."); // Use logger (don't log the whole object)
            // Log specific properties for confirmation
            this.logger(`MidiHandler: midiAccess.inputs available: ${!!this.midiAccess?.inputs}`);
            this.logger(`MidiHandler: midiAccess.outputs available: ${!!this.midiAccess?.outputs}`);

            // Check if midiAccess object looks valid immediately after getting it
            if (!this.midiAccess || !this.midiAccess.inputs || !this.midiAccess.outputs) {
                 this.logger("MidiHandler: midiAccess object seems invalid or missing inputs/outputs properties after request.", 'ERROR'); // Use logger
                 alert("Failed to get valid MIDI access object properties.");
                 return false;
            }
            this.logger("MidiHandler: midiAccess object appears valid. Proceeding with setup."); // Use logger

            this.midiAccess.onstatechange = (event) => {
                this.logger(`MidiHandler: MIDI statechange event triggered for port: ${event.port.name} (${event.port.type}) - ${event.port.state}`); // Use logger
                this.updateDeviceLists();
            };
            this.logger("MidiHandler: Added onstatechange listener."); // Use logger

            this.logger("MidiHandler: Initialization finished. Waiting for onstatechange or refresh...");

            return true;
        } catch (err) {
            this.logger(`MidiHandler: Failed to get MIDI access: ${err.name} - ${err.message}`, 'ERROR'); // Use logger
            // Check for specific error types if possible
            if (err.name === 'SecurityError') {
                alert('Failed to get MIDI access: Permission denied or system configuration issue. Ensure you granted permission and SysEx is allowed if needed.');
            } else {
                alert(`Failed to get MIDI access: ${err.name} - ${err.message}`);
            }
            return false;
        }
    }

    /** Updates the internal lists of inputs and outputs */
    updateDeviceLists() {
        this.logger("MidiHandler: updateDeviceLists() called."); // Use logger
        if (!this.midiAccess) {
            this.logger("MidiHandler: updateDeviceLists called but midiAccess is null.", 'WARN'); // Use logger
            return;
        }
        this.logger("--- MidiHandler: Updating device lists ---"); // Use logger

        this.logger("MidiHandler: Accessing midiAccess.inputs..."); // Use logger
        try {
            this.inputs = Array.from(this.midiAccess.inputs.values());
            this.logger(`MidiHandler: Got inputs, count: ${this.inputs.length}`); // Use logger
        } catch (e) {
             this.logger(`MidiHandler: Error accessing midiAccess.inputs: ${e.message}`, 'ERROR');
             this.inputs = []; // Reset inputs on error
        }

        this.logger("MidiHandler: Accessing midiAccess.outputs..."); // Use logger
         try {
            this.outputs = Array.from(this.midiAccess.outputs.values());
            this.logger(`MidiHandler: Got outputs, count: ${this.outputs.length}`); // Use logger
        } catch (e) {
             this.logger(`MidiHandler: Error accessing midiAccess.outputs: ${e.message}`, 'ERROR');
             this.outputs = []; // Reset outputs on error
        }
        

        // Log exactly what was found THIS time
        this.logger("MidiHandler: Found Inputs:" + (this.inputs.length > 0 ? this.inputs.map(i => ` ${i.name} (ID: ${i.id}, State: ${i.state}, Connection: ${i.connection})`).join(';') : ' None')); // Use logger, format slightly differently for monitor
        this.logger("MidiHandler: Found Outputs:" + (this.outputs.length > 0 ? this.outputs.map(o => ` ${o.name} (ID: ${o.id}, State: ${o.state}, Connection: ${o.connection})`).join(';') : ' None')); // Use logger

        // Deselect if selected device is no longer available
        if (this.selectedInputId && !this.inputs.find(i => i.id === this.selectedInputId)) {
             this.logger(`MidiHandler: Deselecting missing input: ${this.selectedInputId}`); // Use logger
            this.selectInput(null, this.onMessageCallback); 
        }
        if (this.selectedOutputId && !this.outputs.find(o => o.id === this.selectedOutputId)) {
            this.logger(`MidiHandler: Deselecting missing output: ${this.selectedOutputId}`); // Use logger
            this.selectOutput(null);
        }
        
        // Trigger the UI refresh callback if it exists
        if (this.onDevicesUpdatedCallback) {
            this.logger("MidiHandler: Triggering onDevicesUpdatedCallback..."); // Use logger
            try { // Add try-catch around callback for safety
                this.onDevicesUpdatedCallback();
                this.logger("MidiHandler: onDevicesUpdatedCallback executed successfully."); // Use logger
            } catch (callbackError) {
                this.logger(`MidiHandler: Error executing onDevicesUpdatedCallback: ${callbackError.message}`, 'ERROR'); // Use logger
            }
        } else {
            this.logger("MidiHandler: No onDevicesUpdatedCallback registered to trigger."); // Use logger
        }
        this.logger("--- MidiHandler: Finished updating device lists ---"); // Use logger
    }

    getInputDevices() {
        return this.inputs.map(i => ({ id: i.id, name: i.name }));
    }

    getOutputDevices() {
        return this.outputs.map(o => ({ id: o.id, name: o.name }));
    }

    /**
     * Selects a MIDI input device by its ID and sets up the message listener.
     * @param {string|null} deviceId - The ID of the device to select, or null to deselect.
     * @param {function} onMessageCallback - The function to call with MIDI message data (event.data).
     */
    selectInput(deviceId, onMessageCallback) {
        // Remove listener from previously selected input
        if (this.selectedInput) {
            this.selectedInput.onmidimessage = null;
            this.logger(`Removed listener from ${this.selectedInput.name}`); // Use logger
        }

        this.selectedInputId = deviceId;
        this.selectedInput = this.inputs.find(i => i.id === deviceId) || null;
        this.onMessageCallback = onMessageCallback;

        if (this.selectedInput) {
            this.logger(`Selected MIDI Input: ${this.selectedInput.name} (ID: ${this.selectedInput.id})`); // Use logger
            // Add the message listener
            this.selectedInput.onmidimessage = (event) => {
                // this.logger("MIDI Message Received:", event.data); // Can be verbose
                if (this.onMessageCallback) {
                    this.onMessageCallback(event.data); // Pass the raw Uint8Array data
                }
            };
        } else {
            this.logger("MIDI Input Deselected."); // Use logger
            this.onMessageCallback = null;
        }
    }

    /**
     * Selects a MIDI output device by its ID.
     * @param {string|null} deviceId - The ID of the device to select, or null to deselect.
     */
    selectOutput(deviceId) {
        this.selectedOutputId = deviceId;
        this.selectedOutput = this.outputs.find(o => o.id === deviceId) || null;
        if (this.selectedOutput) {
            this.logger(`Selected MIDI Output: ${this.selectedOutput.name} (ID: ${this.selectedOutput.id})`); // Use logger
        } else {
            this.logger("MIDI Output Deselected."); // Use logger
        }
    }

    /**
     * Sends a raw MIDI message (byte array).
     * @param {number[] | Uint8Array} data - Array of MIDI bytes (e.g., [0x90, 60, 100] for Note On).
     */
    sendMIDIMessage(data) {
        if (this.selectedOutput && data) {
            try {
                this.selectedOutput.send(data);
                // this.logger("MIDI Message Sent:", data); // Can be verbose
            } catch (error) {
                this.logger(`Error sending MIDI message: ${error.message}`, 'ERROR'); // Use logger
            }
        } else {
             if (!this.selectedOutput) this.logger("Cannot send MIDI message: No output selected.", 'WARN'); // Use logger
             // else this.logger("Cannot send MIDI message: No data provided.", 'WARN');
        }
    }

    // --- Convenience Methods (Optional) ---

    /**
     * Sends a Note On message.
     * @param {number} note - MIDI Note Number (0-127).
     * @param {number} velocity - Velocity (0-127).
     * @param {number} channel - MIDI Channel (0-15, optional, default 0).
     */
    sendNoteOn(note, velocity = 100, channel = 0) {
        const NOTE_ON = 0x90;
        if (channel < 0 || channel > 15) channel = 0;
        if (note < 0 || note > 127) return;
        if (velocity < 0) velocity = 0;
        if (velocity > 127) velocity = 127;
        this.sendMIDIMessage([NOTE_ON + channel, note, velocity]);
    }

    /**
     * Sends a Note Off message.
     * @param {number} note - MIDI Note Number (0-127).
     * @param {number} velocity - Velocity (0-127, optional, default 0).
     * @param {number} channel - MIDI Channel (0-15, optional, default 0).
     */
    sendNoteOff(note, velocity = 0, channel = 0) {
        const NOTE_OFF = 0x80;
        if (channel < 0 || channel > 15) channel = 0;
        if (note < 0 || note > 127) return;
        if (velocity < 0) velocity = 0;
        if (velocity > 127) velocity = 127;
        this.sendMIDIMessage([NOTE_OFF + channel, note, velocity]);
    }

     /**
     * Sends a Control Change message.
     * @param {number} controller - Controller Number (0-127).
     * @param {number} value - Controller Value (0-127).
     * @param {number} channel - MIDI Channel (0-15, optional, default 0).
     */
    sendControlChange(controller, value, channel = 0) {
        const CONTROL_CHANGE = 0xB0;
        if (channel < 0 || channel > 15) channel = 0;
        if (controller < 0 || controller > 127) return;
        if (value < 0 || value > 127) return;
        this.sendMIDIMessage([CONTROL_CHANGE + channel, controller, value]);
    }

} 