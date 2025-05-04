class MetronomeEngine {
    constructor(initialBpm = 120, initialBeats = 4, initialAccent = 'none', midiHandlerInstance = null) {
        this.bpm = initialBpm;
        this.accentType = initialAccent; // 'none', '4/4', '3/4'
        this.beatsPerMeasure = this._getBeatsFromAccent(this.accentType);
        this.currentBeat = 0;
        this.isPlaying = false;
        this.intervalID = null;

        // MIDI Handler Reference
        this.midiHandler = midiHandlerInstance; // Store the handler

        // Sound Generation
        this.normalFreq = 880; // A5
        this.accentFreq = 1046.5; // C6 (higher pitch for accent)
        this.osc = new p5.Oscillator('sine');
        this.osc.freq(this.normalFreq);
        this.osc.amp(0);    // Start silent
        this.osc.start();   // Start the oscillator, but silent

        // MIDI Note Settings (Example: C5 for now)
        this.midiNote = 72;
        this.midiVelocity = 100;
        this.midiAccentVelocity = 120;
        this.midiChannel = 0; // Channel 1 (index 0)
        this.midiNoteDuration = 50; // ms

        console.log("MetronomeEngine module initialized");
    }

    // Helper to get beat count from type
    _getBeatsFromAccent(type) {
        if (type === '4/4') return 4;
        if (type === '3/4') return 3;
        return 0; // 'none' or invalid means no fixed measure
    }

    start() {
        if (this.isPlaying) return; // Already running

        // Ensure audio context is running (important for some browsers)
        if (getAudioContext().state !== 'running') {
            userStartAudio().then(() => {
                console.log("Audio context started by Metronome");
                this._startTicking(); 
            });
        } else {
            this._startTicking();
        }
    }

    _startTicking() {
        this.isPlaying = true;
        this.currentBeat = 0; // Reset beat count
        const intervalMilliseconds = (60 / this.bpm) * 1000;

        // Call tick immediately and then set interval
        this.tick(); 
        this.intervalID = setInterval(() => this.tick(), intervalMilliseconds);
        console.log(`Metronome started at ${this.bpm} BPM (${this.accentType}). Interval: ${intervalMilliseconds}ms`);
    }

    stop() {
        if (!this.isPlaying) return;

        clearInterval(this.intervalID);
        this.intervalID = null;
        this.isPlaying = false;
        this.currentBeat = 0;
        console.log("Metronome stopped.");
        this.osc.freq(this.normalFreq);
    }

    setTempo(newBpm) {
        if (newBpm <= 0) return;
        this.bpm = newBpm;
        console.log(`Metronome tempo set to ${this.bpm} BPM`);
        if (this.isPlaying) {
            // Restart with new tempo
            this.stop();
            this.start();
        }
    }

    setAccentType(newType) {
        this.accentType = newType;
        this.beatsPerMeasure = this._getBeatsFromAccent(this.accentType);
        this.currentBeat = 0; // Reset beat count when changing time sig
        console.log(`Metronome accent type set to ${this.accentType}`);
        // No need to restart if only accent changes, tick logic handles it
    }

    // Internal method called by setInterval
    tick() {
        if (!this.isPlaying) return;

        // Increment beat only if we have a measure structure
        if (this.beatsPerMeasure > 0) {
            this.currentBeat = (this.currentBeat % this.beatsPerMeasure) + 1;
        } else {
            this.currentBeat = 1; // Always treat as beat 1 if 'none'
        }
        // console.log(`Tick! Beat: ${this.currentBeat}`);

        // --- Sound Output ---
        let freqToUse = this.normalFreq;
        let isDownbeat = (this.beatsPerMeasure > 0 && this.currentBeat === 1);
        if (isDownbeat) {
             freqToUse = this.accentFreq;
        }
        this.osc.freq(freqToUse); 
        this.osc.amp(0.5, 0.01); // Attack
        this.osc.amp(0, 0.05, 0.02); // Decay after short delay
        
        // --- MIDI Output ---
        if (this.midiHandler && this.midiHandler.selectedOutput) {
            const velocity = isDownbeat ? this.midiAccentVelocity : this.midiVelocity;
            const note = this.midiNote;
            const channel = this.midiChannel;

            // Send Note On
            this.midiHandler.sendNoteOn(note, velocity, channel);
            console.log(`MIDI Tick: Note On ${note} Vel ${velocity} Ch ${channel}`);

            // Schedule Note Off
            setTimeout(() => {
                this.midiHandler.sendNoteOff(note, 0, channel);
                 // console.log(`MIDI Tick: Note Off ${note} Ch ${channel}`);
            }, this.midiNoteDuration);
        }

        // TODO: Send MIDI message via MidiHandler (consider velocity for accent)
    }

    getTempo() {
        return this.bpm;
    }

    getIsPlaying() {
        return this.isPlaying;
    }
} 