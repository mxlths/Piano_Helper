# Piano Helper - Project Timeline & Remaining Tasks

**Version:** 1.0
**Date:** 2024-07-27

**Goal:** Achieve the core features outlined in the original `design.md` document using the new React architecture established in `refactor.md`.

--- 

**Phase 1: Setup & Core Structure (React Refactor)**

*   [x] Set up React project with Vite.
*   [x] Create basic placeholder components (`App`, `Controls`, `InfoDisplay`, `MidiMonitorDisplay`, `PianoKeyboard`).
*   [x] Implement basic state management in `App.jsx` for mode, root, scale/chord type.
*   [x] Integrate `MusicLogic`/`Tonal.js` to display basic scale/chord info in `InfoDisplay`.

**Phase 2: MIDI Integration (React Refactor)**

*   [x] Refactor `MidiHandler` logic into `useMidi` Hook/Context using `webmidi.js` v2.
*   [x] Implement MIDI device listing and basic logging in `MidiMonitorDisplay`.
*   [x] Populate MIDI device selection dropdowns in `Controls`.
*   [x] Handle device selection state update.
*   [x] Implement basic incoming MIDI message logging.
*   [ ] **(Testing Required)** Verify incoming MIDI message logging works correctly on target devices (iPad Pro WebMIDI Browser).
*   [ ] **(To Do)** Implement MIDI Output message sending via `useMidi` hook's `sendMessage` function (required for Metronome/Tracks).

**Phase 3: Piano Display (React Refactor)**

*   [ ] Implement canvas drawing logic within `PianoKeyboard` component using native Canvas API.
    *   [ ] Draw basic white and black keys based on range props.
    *   [ ] Implement logic to calculate key positions accurately.
*   [ ] Connect `PianoKeyboard` props to application state.
    *   [ ] Calculate `notesToHighlight` array in `App.jsx` based on `selectedRoot`, `selectedScaleType`, etc. (using `MusicLogic`).
    *   [ ] Calculate `rootMidi` note in `App.jsx`.
    *   [ ] Pass `notesToHighlight`, `rootNote` (MIDI number), and `range` state down to `PianoKeyboard`.
    *   [ ] Update `useEffect` in `PianoKeyboard` to redraw when these props change.
    *   [ ] Implement distinct highlighting for the `rootNote`.

**Phase 4: Metronome (React Refactor & Original Design)**

*   [ ] Refactor `MetronomeEngine` logic into `useMetronome` Hook.
    *   [ ] Implement timing logic (`setInterval` or `requestAnimationFrame`).
    *   [ ] Manage state (`isPlaying`, `bpm`, `accentType`) using `useState`.
    *   [ ] Implement basic audio click using Web Audio API (or integrate `Tone.js`).
    *   [ ] Provide `start`, `stop`, `setTempo`, `setAccentType` functions from the hook.
*   [ ] Implement metronome controls in `Controls` component.
    *   [ ] Add Start/Stop button, Tempo input, Accent select dropdown.
    *   [ ] Connect controls to the `useMetronome` hook functions/state via `App.jsx`.
*   [ ] Add MIDI output functionality to the metronome.
    *   [ ] In `useMetronome`, call the `sendMessage` function from the `useMidi` hook on each tick/beat.
    *   [ ] Send appropriate MIDI clock messages or Note On/Off messages based on settings.

**Phase 5: Interactive MIDI Input (Original Design)**

*   [ ] Define interactive practice drill modes (e.g., 'chord_recognition').
*   [ ] Handle specific incoming MIDI messages (Note On/Off) within `useMidi` or `App.jsx`.
*   [ ] Implement logic for practice drills:
    *   [ ] Generate target notes/chords (using `MusicLogic`).
    *   [ ] Compare incoming MIDI notes with target notes.
    *   [ ] Provide visual feedback (e.g., highlight correct/incorrect notes on `PianoKeyboard`).
    *   [ ] Update UI state (e.g., score, next prompt).

**Phase 6: Backing Track Playback (Original Design)**

*   [ ] Select and package sample MP3 and MIDI backing tracks.
*   [ ] Implement `TrackPlayer` logic (potentially as a `useTrackPlayer` hook).
    *   [ ] Add UI controls (Track select, Play/Pause/Stop) to `Controls.jsx`.
    *   [ ] **MP3 Playback:** Use Web Audio API or a library to load and play MP3 files.
    *   [ ] **MIDI Playback:** 
        *   [ ] Find/integrate a MIDI file parsing library (e.g., `midifile`, `tonejs-midi`).
        *   [ ] Parse MIDI file events (Note On/Off, CC, Tempo changes).
        *   [ ] Implement scheduling logic (using Web Audio clock or `Tone.js`) to trigger MIDI messages at the correct time.
        *   [ ] Send MIDI messages via the `useMidi` hook's `sendMessage` function.

**Phase 7: Refinement & Styling (React Refactor & Original Design)**

*   [ ] Apply consistent CSS styling for a clean UI (CSS Modules recommended).
*   [ ] Add interactivity (e.g., clicking visual piano keys to trigger sound/MIDI).
*   [ ] Thorough testing and bug fixing, especially on the target iOS WebMIDI Browser.
*   [ ] Refine state management if necessary (e.g., use React Context or Zustand).
*   [ ] Add features from `design.md` not covered above (e.g., detailed chord formulas, more scale types).

---

This timeline provides a roadmap based on the original goals and the current state of the React refactor. Items marked [x] are considered complete. 