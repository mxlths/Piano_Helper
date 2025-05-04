// Ensure WebMidi is available (loaded via CDN)
if (typeof WebMidi === 'undefined') {
    alert("WebMidi library not loaded! Check index.html.");
    throw new Error("WebMidi library not loaded!");
}

class MidiHandler {
    constructor(logFunction) {
        // No midiAccess object needed when using webmidi.js library
        this.inputs = [];       
        this.outputs = [];      
        this.selectedInputId = null;
        this.selectedOutputId = null;
        this.selectedInput = null;  // Will store WebMidi Input object
        this.selectedOutput = null; // Will store WebMidi Output object

        this.onMessageCallback = null; 
        this.onDevicesUpdatedCallback = null; 

        this.logger = typeof logFunction === 'function' ? logFunction : console.log; 

        this.isInitializing = false; // Prevent concurrent initializations
        this.initializePromise = null; // Store the promise for potential reuse

        this.logger("MidiHandler module initialized (using webmidi.js)"); 
    }

    /**
     * Initializes the Web MIDI API access using webmidi.js.
     * @param {function} devicesUpdatedCallback - Function to call when device list might have changed.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async initialize(devicesUpdatedCallback) {
        this.logger("MidiHandler: initialize() called.");
        
        // Prevent multiple simultaneous calls
        if (this.isInitializing) {
            this.logger("MidiHandler: Initialization already in progress.", 'WARN');
            return this.initializePromise; // Return existing promise
        }

        // Check if already enabled
        if (WebMidi.enabled) {
            this.logger("MidiHandler: WebMidi already enabled. Updating lists.");
            this.onDevicesUpdatedCallback = devicesUpdatedCallback; // Ensure callback is current
            this.updateDeviceLists(); // Update lists with current devices
            return Promise.resolve(true);
        }

        this.isInitializing = true;
        this.onDevicesUpdatedCallback = devicesUpdatedCallback; 
        this.logger("MidiHandler: Stored devicesUpdatedCallback.");

        this.initializePromise = new Promise((resolve, reject) => {
            this.logger("MidiHandler: Calling WebMidi.enable({ sysex: false })...");
            WebMidi.enable((err) => {
                this.isInitializing = false; // Reset flag when done
                if (err) {
                    this.logger(`MidiHandler: WebMidi.enable() failed: ${err.message}`, 'ERROR');
                    // Attempt to map errors similar to the midi-monitor example
                    let alertMessage = `Failed to get MIDI access: ${err.name} - ${err.message}`;
                    if (!WebMidi.supported) {
                         alertMessage = 'Your browser does not support Web MIDI. We recommend Chrome browser.';
                    } else if (err.name === 'SecurityError' || !WebMidi.enabled) {
                         alertMessage = "You may need to enable MIDI access in your browser or grant permissions (including SysEx if required). See Help.";
                    }
                    alert(alertMessage);
                    reject(false); // Indicate failure
                } else {
                    this.logger("MidiHandler: WebMidi.enable() successful.");
                    
                    // Add listeners *after* successful enable
                    this.addEventListeners();

                    // Initial device list update
                    this.logger("MidiHandler: Calling updateDeviceLists() after successful enable...");
                    this.updateDeviceLists(); 
                    
                    resolve(true); // Indicate success
                }
            }, { sysex: false }); // Request WITHOUT SysEx
        });

        return this.initializePromise;
    }

    // Helper to add listeners (called after successful enable)
    addEventListeners() {
         this.logger("MidiHandler: Removing potential old listeners...");
         WebMidi.removeListener("connected", this.handleDeviceChange);
         WebMidi.removeListener("disconnected", this.handleDeviceChange);
         
         this.logger("MidiHandler: Adding 'connected' and 'disconnected' listeners...");
         // Use a single handler for both connection and disconnection events
         WebMidi.addListener("connected", this.handleDeviceChange);
         WebMidi.addListener("disconnected", this.handleDeviceChange);
    }

    // Single handler for device connection/disconnection
    handleDeviceChange = (e) => { // Use arrow function to maintain 'this' context
        this.logger(`MidiHandler: ${e.type} event for port: ${e.port.name} (${e.port.type})`);
        this.logger("MidiHandler: Calling updateDeviceLists() due to device change...");
        this.updateDeviceLists();
    };

    // Updates the internal lists using WebMidi.inputs/outputs
    updateDeviceLists() {
        this.logger("MidiHandler: updateDeviceLists() called.");
        if (!WebMidi.enabled) {
            this.logger("MidiHandler: updateDeviceLists called but WebMidi is not enabled.", 'WARN');
            return;
        }
        this.logger("--- MidiHandler: Updating device lists (using WebMidi object) ---");

        // Directly use the library's arrays
        this.inputs = WebMidi.inputs; 
        this.outputs = WebMidi.outputs;

        this.logger(`MidiHandler: Got inputs, count: ${this.inputs.length}`);
        this.logger(`MidiHandler: Got outputs, count: ${this.outputs.length}`);
        
        // Log details (library objects have name, id, state, connection, type etc.)
        this.logger("MidiHandler: Found Inputs:" + (this.inputs.length > 0 ? this.inputs.map(i => ` ${i.name} (ID: ${i.id}, State: ${i.state}, Connection: ${i.connection})`).join(';') : ' None'));
        this.logger("MidiHandler: Found Outputs:" + (this.outputs.length > 0 ? this.outputs.map(o => ` ${o.name} (ID: ${o.id}, State: ${o.state}, Connection: ${o.connection})`).join(';') : ' None'));

        // Deselect if selected device is no longer available
        // Use find() directly on the library's arrays
        if (this.selectedInputId && !this.inputs.find(i => i.id === this.selectedInputId)) {
             this.logger(`MidiHandler: Deselecting missing input: ${this.selectedInputId}`);
            this.selectInput(null, this.onMessageCallback); 
        }
        if (this.selectedOutputId && !this.outputs.find(o => o.id === this.selectedOutputId)) {
            this.logger(`MidiHandler: Deselecting missing output: ${this.selectedOutputId}`);
            this.selectOutput(null);
        }
        
        // Trigger the UI refresh callback
        if (this.onDevicesUpdatedCallback) {
            this.logger("MidiHandler: Triggering onDevicesUpdatedCallback..."); 
            try {
                this.onDevicesUpdatedCallback();
                this.logger("MidiHandler: onDevicesUpdatedCallback executed successfully.");
            } catch (callbackError) {
                this.logger(`MidiHandler: Error executing onDevicesUpdatedCallback: ${callbackError.message}`, 'ERROR');
            }
        } else {
            this.logger("MidiHandler: No onDevicesUpdatedCallback registered to trigger.");
        }
        this.logger("--- MidiHandler: Finished updating device lists ---");
    }

    // Return devices in the format expected by sketch.js UI
    getInputDevices() {
        // Map the library's Input objects to {id, name}
        return this.inputs.map(i => ({ id: i.id, name: i.name }));
    }

    getOutputDevices() {
        // Map the library's Output objects to {id, name}
        return this.outputs.map(o => ({ id: o.id, name: o.name }));
    }

    selectInput(deviceId, onMessageCallback) {
        // Remove listener from previously selected webmidi.js Input object
        if (this.selectedInput) {
            this.logger(`MidiHandler: Removing listener from previous input: ${this.selectedInput.name}`);
            this.selectedInput.removeListener('midimessage', 'all', this.handleIncomingMidiMessage);
        }

        this.selectedInputId = deviceId;
        // Find the Input object from the library's array
        this.selectedInput = WebMidi.getInputById(deviceId) || null; 
        this.onMessageCallback = onMessageCallback; // Store sketch's callback

        if (this.selectedInput) {
            this.logger(`Selected MIDI Input: ${this.selectedInput.name} (ID: ${this.selectedInput.id})`);
            // Add the message listener using webmidi.js syntax
            this.logger(`MidiHandler: Adding listener to new input: ${this.selectedInput.name}`);
            this.selectedInput.addListener('midimessage', 'all', this.handleIncomingMidiMessage);
        } else {
            this.logger("MIDI Input Deselected.");
            // this.onMessageCallback = null; // Keep callback in case device comes back?
        }
    }

    // Internal handler to forward messages to sketch's callback
    handleIncomingMidiMessage = (event) => { // Arrow function for 'this'
         // event.data contains the Uint8Array
         // event.timestamp contains high-resolution timestamp
         // event.target is the Input object
        // this.logger(`MIDI Message Received on ${event.target.name}:`, event.data); // Verbose
        if (this.onMessageCallback) {
            this.onMessageCallback(event.data);
        }
    }

    selectOutput(deviceId) {
        this.selectedOutputId = deviceId;
        // Find the Output object from the library's array
        this.selectedOutput = WebMidi.getOutputById(deviceId) || null; 
        if (this.selectedOutput) {
            this.logger(`Selected MIDI Output: ${this.selectedOutput.name} (ID: ${this.selectedOutput.id})`);
        } else {
            this.logger("MIDI Output Deselected.");
        }
    }

    // Sending messages uses the library's Output object methods
    sendMIDIMessage(data) {
        if (this.selectedOutput && data) {
            try {
                this.selectedOutput.send(data);
                // this.logger("MIDI Message Sent:", data); 
            } catch (error) {
                this.logger(`Error sending MIDI message via webmidi.js: ${error.message}`, 'ERROR');
            }
        } else {
             if (!this.selectedOutput) this.logger("Cannot send MIDI message: No output selected.", 'WARN');
        }
    }

    // Convenience methods now use the library's built-in helpers (if desired)
    // Or keep sending raw byte arrays as before.
    // Example using library methods (Note: channel is 1-based in webmidi.js!)

    sendNoteOn(note, velocity = 100, channel = 0) {
        if (this.selectedOutput) {
            // Option 1: Use library helper (channel + 1)
            // this.selectedOutput.playNote(note, channel + 1, { rawVelocity: true, velocity: velocity / 127 });
            // Option 2: Send raw message (as before)
            const NOTE_ON = 0x90;
            if (channel < 0 || channel > 15) channel = 0;
            if (note < 0 || note > 127) return;
            if (velocity < 0) velocity = 0;
            if (velocity > 127) velocity = 127;
            this.sendMIDIMessage([NOTE_ON + channel, note, velocity]);
        } else {
             this.logger("Cannot send NoteOn: No output selected.", 'WARN');
        }
    }

    sendNoteOff(note, velocity = 0, channel = 0) {
        if (this.selectedOutput) {
            // Option 1: Use library helper (channel + 1)
            // this.selectedOutput.stopNote(note, channel + 1, { rawVelocity: true, velocity: velocity / 127 });
            // Option 2: Send raw message (as before)
            const NOTE_OFF = 0x80;
            if (channel < 0 || channel > 15) channel = 0;
            if (note < 0 || note > 127) return;
            if (velocity < 0) velocity = 0;
            if (velocity > 127) velocity = 127;
            this.sendMIDIMessage([NOTE_OFF + channel, note, velocity]);
         } else {
             this.logger("Cannot send NoteOff: No output selected.", 'WARN');
        }
    }

    sendControlChange(controller, value, channel = 0) {
         if (this.selectedOutput) {
            // Option 1: Use library helper (channel + 1)
            // this.selectedOutput.sendControlChange(controller, value, channel + 1);
            // Option 2: Send raw message (as before)
             const CONTROL_CHANGE = 0xB0;
            if (channel < 0 || channel > 15) channel = 0;
            if (controller < 0 || controller > 127) return;
            if (value < 0 || value > 127) return;
            this.sendMIDIMessage([CONTROL_CHANGE + channel, controller, value]);
         } else {
             this.logger("Cannot send CC: No output selected.", 'WARN');
        }
    }

} 