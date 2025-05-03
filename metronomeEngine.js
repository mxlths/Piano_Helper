class MetronomeEngine {
    constructor(initialBpm = 120, initialBeats = 4, initialAccent = 'none') {
        this.bpm = initialBpm;
        this.accentType = initialAccent; // 'none', '4/4', '3/4'
        this.beatsPerMeasure = this._getBeatsFromAccent(this.accentType);
        this.currentBeat = 0;
        this.isPlaying = false;
        this.intervalID = null;

        // Sound Generation
        this.normalFreq = 880; // A5
        this.accentFreq = 1046.5; // C6 (higher pitch for accent)
        this.osc = new p5.Oscillator('sine');
        this.osc.freq(this.normalFreq);
        this.osc.amp(0);    // Start silent
        this.osc.start();   // Start the oscillator, but silent

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

        // Determine frequency based on accent
        let freqToUse = this.normalFreq;
        if (this.beatsPerMeasure > 0 && this.currentBeat === 1) {
             freqToUse = this.accentFreq;
        }
        this.osc.freq(freqToUse); 

        // Play a short sound pulse
        this.osc.amp(0.5, 0.01); // Attack
        this.osc.amp(0, 0.05, 0.02); // Decay after short delay
        
        // Reset freq slightly after sound plays if it was accent (optional, maybe cleaner)
        // setTimeout(() => { if (freqToUse === this.accentFreq) this.osc.freq(this.normalFreq); }, 50);

        // TODO: Send MIDI message via MidiHandler (consider velocity for accent)
    }

    getTempo() {
        return this.bpm;
    }

    getIsPlaying() {
        return this.isPlaying;
    }
} 