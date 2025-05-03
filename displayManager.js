class DisplayManager {
    constructor() {
        this.WHITE_KEY_COLOR = color(255);
        this.BLACK_KEY_COLOR = color(50);
        this.HIGHLIGHT_COLOR = color(255, 165, 0, 150); // Orange with alpha
        this.ROOT_HIGHLIGHT_COLOR = color(255, 0, 0, 180); // Red with alpha

        // Basic layout properties (can be refined)
        this.keyboardStartY = 10;
        this.whiteKeyWidth = 40;
        this.whiteKeyHeight = 150;
        this.blackKeyWidth = this.whiteKeyWidth * 0.6;
        this.blackKeyHeight = this.whiteKeyHeight * 0.6;

        this.keyMap = {}; // Cache key positions and dimensions

        console.log("DisplayManager module initialized");
    }

    /**
     * Draws the piano keyboard on the canvas.
     * @param {number[]} notesToHighlight - Array of MIDI note numbers to highlight.
     * @param {number} rootNote - The MIDI note number of the root note (for distinct highlighting).
     * @param {object} range - Object with startMidi and endMidi for the display range.
     */
    drawKeyboard(notesToHighlight = [], rootNote = null, range = { startMidi: 48, endMidi: 72 }) {
        push(); // Isolate drawing state
        translate(0, this.keyboardStartY);

        // --- Create Key Map Data (positions only) ---
        let currentX = 0;
        this.keyMap = {}; // Clear cache
        const whiteKeyData = [];
        const blackKeyData = [];

        // Calculate white key positions
        for (let midiNote = range.startMidi; midiNote <= range.endMidi; midiNote++) {
            const noteName = musicLogic.midiToNoteName(midiNote); 
            if (!noteName.includes('#')) { // It's a white key
                const keyRect = { 
                    x: currentX, y: 0, w: this.whiteKeyWidth, h: this.whiteKeyHeight, midi: midiNote, isWhite: true 
                };
                this.keyMap[midiNote] = keyRect;
                whiteKeyData.push(keyRect);
                currentX += this.whiteKeyWidth;
            }
        }
        const totalWhiteKeyWidth = currentX;

        // Calculate black key positions
        currentX = 0; 
        for (let midiNote = range.startMidi; midiNote <= range.endMidi; midiNote++) {
            const noteName = musicLogic.midiToNoteName(midiNote);
            if (!noteName.includes('#')) { 
                const nextNoteMidi = midiNote + 1;
                if (nextNoteMidi <= range.endMidi) {
                    const nextNoteName = musicLogic.midiToNoteName(nextNoteMidi);
                    if (nextNoteName.includes('#')) {
                        const keyX = currentX + this.whiteKeyWidth - (this.blackKeyWidth / 2);
                        if (keyX + this.blackKeyWidth <= totalWhiteKeyWidth + 1) { 
                            const keyRect = {
                                x: keyX, y: 0, w: this.blackKeyWidth, h: this.blackKeyHeight, midi: nextNoteMidi, isWhite: false
                            };
                            this.keyMap[nextNoteMidi] = keyRect;
                            blackKeyData.push(keyRect);
                        }
                    }
                }
                 currentX += this.whiteKeyWidth;
            }
        }
        
        // --- Draw White Keys --- 
        stroke(150);
        whiteKeyData.forEach(keyRect => {
            // Set fill based on highlight status
            if (notesToHighlight.includes(keyRect.midi)) {
                fill(keyRect.midi === rootNote ? this.ROOT_HIGHLIGHT_COLOR : this.HIGHLIGHT_COLOR);
            } else {
                fill(this.WHITE_KEY_COLOR);
            }
            rect(keyRect.x, keyRect.y, keyRect.w, keyRect.h);
        });

        // --- Draw Black Keys --- 
        noStroke();
        blackKeyData.forEach(keyRect => {
             // Set fill based on highlight status
             if (notesToHighlight.includes(keyRect.midi)) {
                fill(keyRect.midi === rootNote ? this.ROOT_HIGHLIGHT_COLOR : this.HIGHLIGHT_COLOR);
            } else {
                fill(this.BLACK_KEY_COLOR);
            }
            rect(keyRect.x, keyRect.y, keyRect.w, keyRect.h);
        });

        pop(); // Restore drawing state
    }

    // TODO: Add methods for drawing text, UI controls etc. if needed directly on canvas
    // drawInfoText(infoObject) { ... }
} 