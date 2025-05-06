# Piano Helper React - Current State Summary (Pre-Chord Progression Mode)

This document summarizes the architecture and functionality of the Piano Helper React application based on a review of the `src` directory.

## 1. Core Architecture & State Management

*   **Central Hub:** `src/App.jsx` serves as the main application component. It manages the vast majority of the application's state using React `useState` and `useMemo`.
*   **State Includes:** Current operational mode, selected root note/octave/scale/chord, diatonic chord display options, MIDI input/output state (active notes, latest event), drill status and configuration, metronome state, and MIDI file player state.
*   **Hooks:** Custom hooks are heavily utilized for encapsulating complex logic:
    *   `src/hooks/useMidi.js`: Handles WebMIDI API setup, device discovery, selection, and raw message I/O. It receives callbacks (`onNoteOn`, `onNoteOff`) from `App.jsx` to update MIDI state managed within `App.jsx`. Provides a `sendMessage` function for output.
    *   `src/hooks/useDrill.js`: Manages the logic for generating drill sequences (based on mode and options from `App.jsx`) and processing user MIDI input (`playedNoteEvent` from `App.jsx`) to validate steps and update the score. Relies on data calculated in `App.jsx` (e.g., `calculatedDiatonicChordNotes`).
    *   `src/hooks/useMetronome.js`: Provides metronome functionality, using `useMidi`'s `sendMessage` for sound output.
    *   `src/hooks/useMidiPlayer.js`: Handles loading and playback of MIDI files, using `useMidi`'s `sendMessage`.
*   **Props Drilling:** State and event handlers are passed down from `App.jsx` to child components.

## 2. Music Theory Logic

*   **TonalJS:** The `@tonaljs/tonal` library is the primary tool for music theory calculations. It's used directly within `App.jsx` and `useDrill.js` for tasks like:
    *   Getting scale/chord information (`Scale.get`, `Chord.get`, `Chord.getChord`).
    *   Note conversions (`Note.midi`, `Note.fromMidi`, `Note.pitchClass`, `Note.octave`).
    *   Transposition (`Note.transpose`).
    *   Calculating diatonic chords and their notes.
*   **`src/musicLogic.js`:** Contains a custom `MusicLogic` class with basic, hardcoded interval definitions and conversion functions. **This class appears unused** in the current application logic within `App.jsx`, which favors `tonaljs`.

## 3. Components & UI

*   **`src/components/Controls.jsx`:** Renders the main control panel, organized into tabs ("Setup", "Metronome", "Backing Track", "GM2 Sounds"). It displays UI elements (dropdowns, buttons, checkboxes) based on the `currentMode` and other state props from `App.jsx`. It calls handler functions passed from `App.jsx` on user interaction.
    *   **NEW (Voicing):** Added voicing controls (Split Hand, LH Offset, RH Rootless) under the Diatonic Chords tab, visible for `diatonic_chords` and `chord_progression` modes.
    *   **NEW (Voicing Clarity):** Duplicated the voicing controls (Show 7ths, RH Inversion, Split Hand, etc.) to appear directly in the Setup tab when `chord_progression` mode is active.
*   **`src/components/DrillControls.jsx`:** Displays controls specific to the drill mode (start/stop, options like octaves/style/repetitions) and shows the current drill status (step, score, expected item label).
*   **`src/components/PianoKeyboard.jsx`:** A canvas-based virtual keyboard. It visually represents keys, highlights notes based on the current mode/selection (`notesToHighlight`), shows actively played MIDI notes (`playedNotes`), and indicates the notes expected in the current drill step (`expectedNotes`).
*   **`src/components/InfoDisplay.jsx`:** Shows textual information about the currently selected scale, searched chord, or diatonic chord (name, notes, formula, MIDI values).
*   **`src/components/MidiMonitorDisplay.jsx`:** Displays a log of incoming MIDI messages (provided by `useMidi.js`).
*   **`src/components/Gm2SoundSelector.jsx`:** Component for selecting GM2 sounds, interacting with `sendMidiMessage`.

## 4. Existing Modes

The application currently supports the following modes (`currentMode` state in `App.jsx`):

*   **`scale_display`:** Select a root/octave/scale type. The `InfoDisplay` shows scale details, and `PianoKeyboard` highlights the scale notes. Drills generate steps for playing scale notes.
*   **`chord_search`:** Select a root/octave/chord type. `InfoDisplay` shows chord details, and `PianoKeyboard` highlights the chord notes. Drills generate steps for playing the selected chord across all roots/octaves.
*   **`diatonic_chords`:** Select a root/octave/scale. `Controls.jsx` shows buttons for each diatonic degree. Selecting a degree shows its details in `InfoDisplay` and highlights notes on `PianoKeyboard`. Options exist for showing 7ths, RH inversion, and split-hand voicing. Drills generate steps for playing the diatonic chords sequentially.

## 5. Drill Functionality

*   Managed primarily by `useDrill.js`, triggered by `isDrillActive` state in `App.jsx`.
*   Generates a sequence of steps based on `currentMode` and `drillOptions` (octaves, repetitions, style).
*   Listens to `playedNoteEvent` (MIDI note-on from `App.jsx`).
*   Validates played notes against the `expectedMidiNotes` for the current step.
*   Handles both single-note steps (scales) and multi-note chord steps (chord search, diatonic chords). Chord steps require all expected notes to be played (currently order-independent within the chord) before advancing.
*   Updates `currentScore`.
*   Provides `currentDrillStep` data (including `expectedMidiNotes` and a `stepLabel`) back to `App.jsx` for display via `DrillControls` and `PianoKeyboard`.

## 6. Key Dependencies

*   `react`
*   `@tonaljs/tonal`
*   `webmidi`

This structure provides a solid foundation. The plan for the Chord Progression mode involves adding a new mode value, managing progression data, adding UI controls, and extending `useDrill.js` to generate and validate progression-based drill sequences. 

### 4. Core Logic & Calculations (`App.jsx` `useMemo` hooks)
*   **Diatonic Chords:** Calculates the names (`diatonicTriads`, `diatonicSevenths`) and MIDI notes (`calculatedDiatonicChordNotes`) for all diatonic chords in the selected key/scale, applying RH inversion and split-hand voicing options.
*   **Progression Chords:**
    *   Loads progressions from `src/data/progressions.json`.
    *   `calculatedProgressionChords`: Takes the selected Roman numeral progression, transposes it to the current key/scale using `@tonaljs/roman-numeral` and `@tonaljs/scale`.
    *   **NEW (Voicing):** Applies selected voicing options (Show 7ths, RH Inversion, Split Hand, LH Offset, RH Rootless) during the calculation of the final `midiNotes` for each chord in the progression.
*   `notesToHighlight`: Determines which MIDI notes should be highlighted on the `PianoKeyboard` based on the current mode and selections (scale notes, single chord notes, all notes in the current diatonic degree, or all unique notes in the current progression voicing).

### 5. Current Functionality Summary
*   **Mode Switching:** User can switch between Scale Display, Chord Search, Diatonic Chords, and Chord Progression modes.
*   **Basic Display:** Notes for scales and selected chords are displayed and highlighted.
*   **Diatonic Chords:** Diatonic triads/sevenths for the selected scale are calculated, displayed, and can be selected individually. RH Inversions and basic Split Hand voicing (LH root + RH chord) are implemented for this mode.
*   **Chord Progressions:**
    *   User can select from predefined progressions.
    *   The progression is transposed to the current key and displayed in `InfoDisplay` (Roman, Name, Notes, MIDI).
    *   All unique notes across the *current voicing* of the progression are highlighted on the keyboard.
    *   **NEW (Voicing):** Voicing options (Show 7ths, RH Inversion, Split Hand, LH Offset, RH Rootless) can be configured and are applied to the calculated progression chords.
*   **Drills:**
    *   Drills are available for Scale Display, Chord Search, Diatonic Chords, and Chord Progression modes.
    *   Drill options (octaves, repetitions, style) can be configured.
    *   The drill sequence is generated based on the mode and options.
    *   Basic note/chord checking logic compares MIDI input to the expected notes for the current step.
    *   The drill advances upon correct completion of a step (single note or full chord based on *current voicing*).
    *   Basic scoring (correct/incorrect count) is implemented.
*   **MIDI:** Input/Output selection, MIDI event monitoring.
*   **Metronome:** Basic metronome functionality.
*   **MIDI Player:** Basic MIDI file loading and playback.
*   **GM2 Sounds:** Basic interface for sending program/bank changes.
    - **Status (2024-07-27):** Functionality restored. The GM2 Sound Selector component is now correctly rendered within the "GM2 Sounds" tab in the `Controls` component and successfully passes the `sendMessage` function to allow sending MIDI messages.

## MIDI Output

- **Sending Messages:** The `

## Backing Track Tab

*   **Purpose**: Allows the user to load and control playback of pre-recorded MIDI backing tracks (drum loops, etc.).
*   **Components Involved**:
    *   `App.jsx`: Manages the list of available MIDI files (`ALL_MIDI_FILES` constant, including genre and URL) and the selected genre state (`selectedMidiGenre`, `setSelectedMidiGenre`). Passes these and playback control functions (`loadMidiFile`, `playMidiFile`, etc.) to `Controls`.
    *   `Controls.jsx`: Displays the "Backing Track" tab UI. Includes:
        *   A dropdown (`midi-genre-select`) to select the desired **Genre** from the `midiGenres` prop (defined in `App.jsx`). Populated by `MIDI_GENRES` constant in `App.jsx`.
        *   A dropdown (`midi-file-select`) to select a specific **MIDI Track** from the `availableMidiFiles` prop, filtered by the `selectedMidiGenre` state.
        *   Playback buttons (Play, Pause, Stop) which call the corresponding functions received from `App.jsx` (`onPlayMidiFile`, `onPauseMidiFile`, `onStopMidiFile`).
        *   Displays the `loadedMidiFileName` and current `playbackState` received from `App.jsx`.
    *   `useMidiPlayer.js`: The hook responsible for the actual MIDI file loading (using `MidiPlayer.loadDataUri()`) and playback logic (using `MidiPlayer.play()`, `.pause()`, `.stop()`). It interacts with `useMidi` to send MIDI messages via `sendMessage`.
*   **State:**
    *   `App.jsx`:
        *   `selectedMidiGenre`: Stores the currently selected genre string (e.g., 'Jazz', 'Latin').
        *   `ALL_MIDI_FILES`: A constant array of objects, each containing `{ genre: string, name: string, url: string }` for all available backing tracks.
        *   `MIDI_GENRES`: A constant array listing the available genre strings.
    *   `useMidiPlayer.js`:
        *   `player`: Holds the `MidiPlayer` instance.
        *   `playbackState`: Tracks the current state ('stopped', 'playing', 'paused').
        *   `loadedFileName`: Stores the `name` property of the currently loaded MIDI file.
*   **Functionality**:
    1.  `App.jsx` defines the `ALL_MIDI_FILES` array (mapping names to URLs and genres) and the `MIDI_GENRES` array.
    2.  `App.jsx` passes `ALL_MIDI_FILES`, `MIDI_GENRES`, `selectedMidiGenre`, and `handleMidiGenreChange` down to `Controls.jsx`.
    3.  `Controls.jsx` displays the genre dropdown. When changed, it calls `onMidiGenreChange` (which updates `selectedMidiGenre` in `App.jsx`).
    4.  `Controls.jsx` filters `availableMidiFiles` based on `selectedMidiGenre` using `useMemo`.
    5.  The filtered list populates the track selection dropdown.
    6.  When a track is selected from the dropdown, `Controls.jsx` calls `onLoadMidiFile` (passed from `App.jsx`, which calls `loadMidiFile` from `useMidiPlayer`) with the selected file's URL.
    7.  `useMidiPlayer` uses `MidiPlayer.loadDataUri(url)` to fetch and load the MIDI file data.
    8.  `useMidiPlayer` updates `loadedFileName` state.
    9.  Playback buttons in `Controls.jsx` call `onPlay/Pause/StopMidiFile` (passed from `App.jsx`), which trigger the corresponding functions in `useMidiPlayer` (`play`, `pause`, `stop`).
    10. `useMidiPlayer` uses the `sendMessage` function (obtained from `useMidi` via `App.jsx`) to send MIDI events from the loaded file to the selected MIDI output during playback.
*   **User Interaction**:
    *   Select a **Genre** from the first dropdown.
    *   Select a **Track** from the second dropdown (filtered by genre).
    *   Use the Play/Pause/Stop buttons to control playback.
    *   Playback requires a MIDI Output device to be selected in the "Setup" tab.