class MidiHandler {
    constructor() {
        this.midiAccess = null; // Stores the result of requestMIDIAccess
        this.inputs = [];       // Array of available MIDIInput objects
        this.outputs = [];      // Array of available MIDIOutput objects
        this.selectedInputId = null;
        this.selectedOutputId = null;
        this.selectedInput = null;  // The actual MIDIInput object
        this.selectedOutput = null; // The actual MIDIOutput object

        this.onMessageCallback = null; // Function to call when a MIDI message arrives

        console.log("MidiHandler module initialized");
    }

    /**
     * Initializes the Web MIDI API access.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async initialize() {
        if (!navigator.requestMIDIAccess) {
            console.error("Web MIDI API is not supported in this browser.");
            alert("Web MIDI API is not supported in this browser.");
            return false;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false }); // sysex: false for security
            console.log("MIDI Access Granted:", this.midiAccess);

            // Get lists of inputs and outputs
            this.updateDeviceLists();

            // Add listeners for device connection changes
            this.midiAccess.onstatechange = (event) => {
                console.log("MIDI state changed:", event.port.name, event.port.state);
                this.updateDeviceLists();
                // TODO: Trigger UI update if needed
                 // Potentially re-select devices if they disconnect/reconnect?
                 // Or notify the user.
            };

            return true;
        } catch (err) {
            console.error("Failed to get MIDI access:", err);
            alert(`Failed to get MIDI access: ${err}`);
            return false;
        }
    }

    /** Updates the internal lists of inputs and outputs */
    updateDeviceLists() {
        if (!this.midiAccess) return;

        this.inputs = Array.from(this.midiAccess.inputs.values());
        this.outputs = Array.from(this.midiAccess.outputs.values());

        console.log("Available MIDI Inputs:", this.inputs.map(i => ({ id: i.id, name: i.name })));
        console.log("Available MIDI Outputs:", this.outputs.map(o => ({ id: o.id, name: o.name })));

        // Deselect if selected device is no longer available
        if (this.selectedInputId && !this.inputs.find(i => i.id === this.selectedInputId)) {
            this.selectInput(null); 
        }
        if (this.selectedOutputId && !this.outputs.find(o => o.id === this.selectedOutputId)) {
            this.selectOutput(null);
        }
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
            console.log(`Removed listener from ${this.selectedInput.name}`);
        }

        this.selectedInputId = deviceId;
        this.selectedInput = this.inputs.find(i => i.id === deviceId) || null;
        this.onMessageCallback = onMessageCallback;

        if (this.selectedInput) {
            console.log(`Selected MIDI Input: ${this.selectedInput.name} (ID: ${this.selectedInput.id})`);
            // Add the message listener
            this.selectedInput.onmidimessage = (event) => {
                // console.log("MIDI Message Received:", event.data);
                if (this.onMessageCallback) {
                    this.onMessageCallback(event.data); // Pass the raw Uint8Array data
                }
            };
        } else {
            console.log("MIDI Input Deselected.");
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
            console.log(`Selected MIDI Output: ${this.selectedOutput.name} (ID: ${this.selectedOutput.id})`);
        } else {
            console.log("MIDI Output Deselected.");
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
                // console.log("MIDI Message Sent:", data);
            } catch (error) {
                console.error("Error sending MIDI message:", error, "Data:", data);
            }
        } else {
             if (!this.selectedOutput) console.warn("Cannot send MIDI message: No output selected.");
             // else console.warn("Cannot send MIDI message: No data provided.");
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