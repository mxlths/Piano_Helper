class MusicLogic {
    constructor() {
        // Define musical constants
        this.NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // Define scale intervals (semitones from root)
        this.SCALE_INTERVALS = {
            'major': [0, 2, 4, 5, 7, 9, 11],
            // TODO: Add minor (natural, harmonic, melodic), pentatonic, etc.
        };

        // Define chord intervals (semitones from root)
        this.CHORD_INTERVALS = {
            'maj': [0, 4, 7], // Major triad
            'min': [0, 3, 7], // Minor triad
            // TODO: Add dominant 7th, minor 7th, diminished, augmented, etc.
        };

        console.log("MusicLogic module initialized");
    }

    /**
     * Converts a note name (e.g., "C4", "F#3") to a MIDI note number.
     * Handles sharps (#) but not flats (b) for now.
     * Assumes octave 4 if not specified.
     * @param {string} noteName - The note name (e.g., "C#4").
     * @returns {number|null} The MIDI note number or null if invalid.
     */
    noteNameToMidi(noteName) {
        const match = noteName.toUpperCase().match(/^([A-G])(#?)(\d?)$/);
        if (!match) return null;

        let note = match[1];
        let sharp = match[2] === '#';
        let octaveStr = match[3];
        let octave = octaveStr ? parseInt(octaveStr, 10) : 4;

        let baseNoteIndex = this.NOTE_NAMES.findIndex(n => n.startsWith(note));
        if (baseNoteIndex === -1) return null;

        let baseMidi = (octave + 1) * 12 + baseNoteIndex;

        // Adjust index for sharps
        let noteIndex = this.NOTE_NAMES.indexOf(note + (sharp ? '#' : ''));
        if (noteIndex === -1) {
             // Handle cases like E# or B# if needed, or return null
             // Simple approach: If base is E or B and sharp is requested, invalid for standard NOTE_NAMES
             if ((note === 'E' || note === 'B') && sharp) return null;
             // Otherwise, it might be a non-sharp note where sharp was specified (e.g. F# input maps to F# index)
             noteIndex = baseNoteIndex; // Fallback to base if sharp version not found (e.g., C# -> C index 0)
             // Find the actual index of the sharp note if it exists
             const sharpIndex = this.NOTE_NAMES.indexOf(note + '#');
             if(sharpIndex !== -1 && sharp) noteIndex = sharpIndex; 
             else if (sharpIndex === -1 && sharp) return null; // Sharp specified but not in list
        }
        
        // Recalculate MIDI based on potentially adjusted index
        baseMidi = (octave + 1) * 12 + noteIndex;

        return baseMidi;
    }

    /**
     * Converts a MIDI note number to its name (e.g., 60 -> "C4").
     * @param {number} midiValue - The MIDI note number (0-127).
     * @returns {string} The note name.
     */
    midiToNoteName(midiValue) {
        if (midiValue < 0 || midiValue > 127) return "Invalid MIDI value";
        const octave = Math.floor(midiValue / 12) - 1;
        const noteIndex = midiValue % 12;
        return this.NOTE_NAMES[noteIndex] + octave;
    }

    /**
     * Generates the MIDI note numbers for a scale.
     * @param {string|number} root - The root note name (e.g., "C4") or MIDI number.
     * @param {string} scaleType - The type of scale (e.g., 'major').
     * @returns {object|null} An object { name, type, rootMidi, notes, formula } or null.
     */
    getScale(root, scaleType) {
        const rootMidi = typeof root === 'string' ? this.noteNameToMidi(root) : root;
        if (rootMidi === null || !this.SCALE_INTERVALS[scaleType]) {
            console.error(`Invalid root (${root}) or scale type (${scaleType})`);
            return null;
        }

        const intervals = this.SCALE_INTERVALS[scaleType];
        const notes = intervals.map(interval => rootMidi + interval);
        const rootName = this.midiToNoteName(rootMidi).replace(/\d+$/, ''); // Get note name without octave

        // Placeholder for formula generation
        const formula = intervals.map((_, i) => i + 1).join(' '); // Simple 1 2 3...

        return {
            name: `${rootName} ${scaleType}`,
            type: scaleType,
            rootMidi: rootMidi,
            notes: notes,
            formula: formula
        };
    }

    /**
     * Generates the MIDI note numbers for a chord.
     * @param {string|number} root - The root note name (e.g., "C4") or MIDI number.
     * @param {string} chordType - The type of chord (e.g., 'maj', 'min').
     * @returns {object|null} An object { name, type, rootMidi, notes, formula } or null.
     */
    getChord(root, chordType) {
        const rootMidi = typeof root === 'string' ? this.noteNameToMidi(root) : root;
        if (rootMidi === null || !this.CHORD_INTERVALS[chordType]) {
            console.error(`Invalid root (${root}) or chord type (${chordType})`);
            return null;
        }

        const intervals = this.CHORD_INTERVALS[chordType];
        const notes = intervals.map(interval => rootMidi + interval);
        const rootName = this.midiToNoteName(rootMidi).replace(/\d+$/, ''); // Get note name without octave

        // Placeholder for formula generation
        const formula = "TBD"; // Needs more sophisticated interval naming (e.g., 1 3 5)

        return {
            name: `${rootName}${chordType}`,
            type: chordType,
            rootMidi: rootMidi,
            notes: notes,
            formula: formula
        };
    }

     /**
     * Get the formula string for a scale type.
     * @param {string} scaleType - The type of scale (e.g., 'major').
     * @returns {string} The formula string.
     */
    getScaleFormula(scaleType) {
        // Basic implementation for now
        if (!this.SCALE_INTERVALS[scaleType]) return "Unknown Scale Type";
        return this.SCALE_INTERVALS[scaleType].map((_, i) => i + 1).join(' ');
    }

     /**
     * Get the formula string for a chord type.
     * @param {string} chordType - The type of chord (e.g., 'maj', 'min').
     * @returns {string} The formula string.
     */
     getChordFormula(chordType) {
        // More complex - needs interval names (e.g., 1, 3, 5 or 1, b3, 5)
        // Placeholder:
        if (!this.CHORD_INTERVALS[chordType]) return "Unknown Chord Type";
        if (chordType === 'maj') return "1 3 5";
        if (chordType === 'min') return "1 b3 5";
        return "TBD";
    }

} 