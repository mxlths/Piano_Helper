**Piano Helper - Design Document (Draft 1)**

**1. Introduction & Goals**

*   **Purpose:** A web-based p5.js application designed as a practice aid for piano players, initially targeting iPad Pro and desktop browsers.
*   **Core Features:**
    *   Visual display of scales and chords on a piano keyboard representation.
    *   Simultaneous display of scale/chord formula text.
    *   Basic metronome (synthesized sound initially, MIDI output target).
    *   Playback of pre-packaged MP3 and MIDI backing tracks.
    *   WebMIDI output for metronome and backing tracks (targeting GM devices like Roland FP-60).
    *   WebMIDI input for interactive practice drills (e.g., chord recognition).
*   **Target User:** Initially personal use, designed for potential public release.
*   **Non-Goals (Initial):** User uploads, complex sound synthesis, saving/loading state, detailed inversion visualization (TBD), specific UI design (TBD).

**2. Architecture Overview**

*   **Framework:** p5.js
*   **Key Modules:**
    *   `MusicLogic`: Handles music theory calculations (scale generation, chord generation, formula derivation). Potential for integrating `Tonal.js` later.
    *   `DisplayManager`: Responsible for rendering all visual elements (keyboard, text, metronome visuals, UI controls).
    *   `MetronomeEngine`: Manages metronome timing, sound generation (via p5.sound or direct Web Audio), and MIDI output.
    *   `TrackPlayer`: Handles loading and playback of audio (MP3) and MIDI backing tracks. Will need MIDI parsing/playback logic.
    *   `MidiHandler`: Manages WebMIDI API interactions for both input (drills) and output (metronome, backing tracks).
    *   `UIManager`: Handles user interactions (dropdowns, clicks, piano key selections) and manages application state (current view, selected scale/chord, etc.).

**3. Module Details (Refined)**

*   **`UIManager` (Central Coordinator):**
    *   **Responsibility:** Holds the overall application state (current mode, selected notes/scales/chords, tempo, etc.). Listens for user interactions (UI clicks, key presses, MIDI input via `MidiHandler`). Orchestrates actions by calling other modules based on user input and state changes.
    *   **Interactions:** Receives UI events, receives MIDI input events from `MidiHandler`, calls `MusicLogic` for calculations, tells `DisplayManager` what to render, tells `MetronomeEngine` or `TrackPlayer` to start/stop/configure, tells `MidiHandler` to send messages.
    *   **Example State:** `currentMode`, `selectedRoot`, `selectedScaleType`, `selectedChordType`, `metronomeSettings`, `activeNotes` (from MIDI input or selection).

*   **`MusicLogic` (The Theorist):**
    *   **Responsibility:** Purely computational. Takes musical parameters (root, type) and returns musical data (note lists, names, formulas). Contains no state about the *current* application view. Can handle lookups (MIDI number to name).
    *   **Interactions:** Called by `UIManager` when calculations are needed. Does not directly interact with UI, MIDI, or Audio.
    *   **Example Functions:** `getScaleNotes(root, type)`, `getChordNotes(root, type)`, `getNoteName(midiValue)`, `getScaleFormula(type)`.

*   **`DisplayManager` (The Artist):**
    *   **Responsibility:** Handles all rendering to the p5.js canvas and potentially manipulating HTML elements outside the canvas for text display if needed. Draws the keyboard, highlights notes, displays text, renders UI elements based on data provided by `UIManager`.
    *   **Interactions:** Called by `UIManager` within the `draw()` loop (or on demand) with the necessary data to render the current state. May receive direct p5.js mouse/touch events for things like clicking on the visual keyboard, which it forwards to `UIManager`.
    *   **Example Functions:** `drawKeyboard(notesToHighlight, range)`, `drawInfoText(textObject)`, `drawControls(controlStates)`.

*   **`MetronomeEngine` (The Timekeeper):**
    *   **Responsibility:** Manages precise timing for the metronome. Handles starting, stopping, and tempo/time signature changes. Triggers sound playback (initially) and MIDI messages.
    *   **Interactions:** Controlled by `UIManager` (`start`, `stop`, `setTempo`). When a beat occurs, it triggers sound (p5.sound/Web Audio) and tells `MidiHandler` to send the appropriate MIDI message. May update state within `UIManager` (e.g., `currentBeat`).
    *   **Example Functions:** `start()`, `stop()`, `setTempo(bpm)`, `setTimeSignature(beats, division)`, `getCurrentBeat()`.

*   **`TrackPlayer` (The DJ):**
    *   **Responsibility:** Loads, plays, pauses, and stops pre-packaged audio (MP3) and MIDI files. Needs internal logic to parse and sequence MIDI file events.
    *   **Interactions:** Controlled by `UIManager` (`playTrack`, `pause`, `stop`, `selectTrack`). Uses p5.sound for audio playback. For MIDI playback, it parses the file and uses its own internal timer (or hooks into the main clock) to tell `MidiHandler` to send MIDI messages at the correct times.
    *   **Example Functions:** `loadTrack(trackData)`, `play()`, `pause()`, `stop()`, `getTrackList()`.

*   **`MidiHandler` (The Translator):**
    *   **Responsibility:** Abstracts the Web MIDI API. Initializes MIDI access, lists devices, sends outgoing MIDI messages, and listens for incoming MIDI messages.
    *   **Interactions:** Initialized by `UIManager`. Provides device lists to `UIManager`. Receives messages to send from `MetronomeEngine` and `TrackPlayer`. Listens for MIDI input and forwards parsed messages (e.g., note on/off) to `UIManager` for handling.
    *   **Example Functions:** `initialize(onReadyCallback)`, `getOutputDevices()`, `getInputDevices()`, `selectOutput(deviceId)`, `selectInput(deviceId, onMessageCallback)`, `sendNoteOn(note, velocity, channel)`, `sendNoteOff(note, channel)`.

**4. Core Data Structures**

*   **`Note Representation`:** Primarily use MIDI note numbers (integers 0-127) for internal calculations and communication between modules. `MusicLogic` can provide functions to get note names (e.g., "C#4") from MIDI numbers when needed for display.
*   **`Scale/Chord Data` (Output from `MusicLogic`):**
    *   An object containing: `{ name: "C Major", type: "major", rootMidi: 60, notes: [60, 62, 64, 65, 67, 69, 71], formula: "1 2 3 4 5 6 7" }` (or similar). `notes` array holds MIDI numbers.
*   **`Metronome Settings` (Part of `UIManager` state):**
    *   An object: `{ isPlaying: false, bpm: 120, timeSignature: { beats: 4, division: 4 } }`
*   **`Application State` (Managed by `UIManager`):**
    *   An object holding the current context:
        ```javascript
        {
          currentMode: 'scale_display', // 'chord_display', 'metronome', 'track_player', 'chord_drill'
          selectedRoot: 'C', // Or MIDI note number e.g., 60
          selectedScaleType: 'major',
          selectedChordType: null,
          displayKeyboardRange: { startMidi: 48, endMidi: 72 }, // Example range
          currentScaleNotes: [], // MIDI numbers
          currentChordNotes: [], // MIDI numbers
          metronome: { isPlaying: false, bpm: 120, timeSignature: { beats: 4, division: 4 } },
          selectedTrack: null, // Info about the loaded track
          trackPlayerState: 'stopped', // 'playing', 'paused'
          midiInputDevice: null, // ID of selected input
          midiOutputDevice: null, // ID of selected output
          // Potentially state for chord drills, etc.
        }
        ```

**5. Technology Stack (Initial)**

*   **Core:** HTML, CSS, JavaScript
*   **Library:** p5.js (including p5.sound)
*   **APIs:** Web Audio API (likely via p5.sound initially), Web MIDI API
*   **Potential Future Libraries:** `Tonal.js` (Music Theory), `Tone.js` (Advanced Audio/Scheduling), MIDI file parsing library.

**6. Next Steps**

1.  Refine the responsibilities of each module.
2.  Define the core data structures (e.g., how to represent a scale, a chord, metronome settings).
3.  Sketch out the basic HTML structure and p5.js `setup()` and `draw()` loop organization.
4.  Start implementing the `MusicLogic` module for basic scales/chords.
5.  Implement the basic `DisplayManager` to draw the keyboard and text.
6.  Tackle the `MetronomeEngine` with basic synthesized sound. 