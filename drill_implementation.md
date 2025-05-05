# Drills Feature Implementation Plan

## I. Goal

Implement an interactive drill feature within the Piano Helper application that tests the user's ability to play scales and chords based on the currently selected mode and options, utilizing MIDI input and providing visual feedback and scoring.

## II. Proposed Architecture & Components

1.  **`App.jsx` State:**
    *   `isDrillActive` (boolean): Toggles drill mode on/off.
    *   `currentDrillStep` (object): Stores the expected note(s) and progress (e.g., `{ expectedMidiNotes: [60] or [60, 64, 67], type: 'note' or 'chord', stepIndex: 0, totalSteps: 56 }`).
    *   `drillScore` (object): Tracks performance (e.g., `{ correctNotes: 0, incorrectNotes: 0, correctSteps: 0, incorrectSteps: 0 }`).
    *   `drillOptions` (object): Stores user-selected options for the *current* drill session (e.g., `{ mode: 'scale', octaves: 2, repetitions: 1, style: 'ascending', inversions: [0, 1] }`).

2.  **`useDrill` Custom Hook:**
    *   **Responsibilities:** Manages drill state (`isActive`, `currentStep`, `score`), generates drill sequences based on `drillOptions` and context from `App.jsx`, processes incoming MIDI forwarded from `useMidi`, updates score, determines step advancement.
    *   **Inputs:** `isDrillActive`, `currentMode`, relevant selections (`scaleName`, `selectedChordType`, `diatonicTriads/Sevenths`, UI settings for Diatonic mode), `drillOptions`, MIDI events.
    *   **Outputs:** `currentDrillStep`, `drillScore`, `notesPlayedThisStep` (object `{correct: [], incorrect: []}` for keyboard feedback), functions (`startDrill`, `stopDrill`, `resetDrill`, `setDrillOptions`).

3.  **`Controls.jsx` UI:**
    *   A "Drills" sub-section will appear within the controls relevant to the current mode (`scale_display`, `chord_search`, `diatonic_chords`).
    *   **Activation:** "Start Drill" and "Stop Drill" buttons within the sub-section.
    *   **Options Panel:** Inputs specific to the current mode's drill type (conditionally displayed):
        *   Scale: Octaves (number input), Repetitions (number input), Style (select: Ascending, Descending, Ascending/Descending, Thirds).
        *   Chord Search: Octaves (number input for transposition), Inversions (checkboxes: Root, 1st, 2nd, 3rd - disable 3rd if base chord is triad).
        *   Diatonic Chords: Repetitions (number input - how many times to cycle through degrees 1-7). Options are taken from main UI (7ths, Split, RH Inversion).
    *   **Progress/Score Display:** Show current step (`stepIndex`/`totalSteps`) and score (`correctNotes`/`incorrectNotes`).

4.  **`PianoKeyboard.jsx` Enhancements:**
    *   **New Props:**
        *   `expectedDrillNotes` (array of MIDI numbers for the current step).
        *   `correctPlayedNotes` (array of MIDI numbers played correctly in the current step).
        *   `incorrectPlayedNotes` (array of MIDI numbers played incorrectly in the current step).
    *   **Highlighting Logic:**
        *   Render `expectedDrillNotes` with a distinct color (e.g., yellow/orange).
        *   Temporarily flash `correctPlayedNotes` green on input.
        *   Temporarily flash `incorrectPlayedNotes` red on input.

## III. Core Drill Logic (`useDrill` Hook Details)

1.  **State:** Manage internal state for the currently generated drill sequence, current step index, notes expected in the current step, notes *received* in the current step, score.
2.  **`startDrill(options, context)`:**
    *   Sets `isActive = true`.
    *   Resets score and step index.
    *   Generates the full drill sequence based on `options` and `context` (scale, chord type, etc.).
    *   Sets the `currentDrillStep` to the first step in the sequence.
3.  **`stopDrill()`:**
    *   Sets `isActive = false`.
    *   Optionally displays final score summary.
    *   Clears drill state.
4.  **`processMidiInput(midiNoteNumber)`:**
    *   If `isActive` is false, ignore.
    *   Check if `midiNoteNumber` is one of the `currentDrillStep.expectedMidiNotes`.
    *   **If Correct:**
        *   Add to `notesPlayedThisStep.correct`.
        *   Increment `drillScore.correctNotes`.
        *   Check if all expected notes for this step have now been played. If yes, advance to the next step (update `currentDrillStep`, clear `notesPlayedThisStep`). If it was the last step, call `stopDrill()`.
    *   **If Incorrect:**
        *   Add to `notesPlayedThisStep.incorrect`.
        *   Increment `drillScore.incorrectNotes`.
        *   (Note: An incorrect note does not prevent step completion, per user requirement).
5.  **Step Generation (Mode Specific):**

    *   **Scale Mode:**
        *   Options: `octaves`, `repetitions`, `style`.
        *   Generate sequence of single MIDI notes based on scale notes over `octaves`, ordered by `style`, repeated `repetitions` times. Each element in sequence is a `currentDrillStep` object expecting one note.
    *   **Chord Search Mode:**
        *   Options: `octaves` (transposition), `inversions` (array like `[0, 1]` etc.).
        *   Generate sequence: Iterate roots (`C`, `C#`... `B`). For each root, generate base chord. If inversions selected, generate inverted versions. Transpose each chord by `octaves`. Each step expects an array of MIDI notes representing the chord.
    *   **Diatonic Chords Mode:**
        *   Options: `repetitions`. Uses current UI settings (`showSevenths`, `splitHandVoicing`, `splitHandInterval`, `rhInversion`).
        *   Generate sequence: Cycle through degrees 0-6. For each degree, get the base chord name (`diatonicTriads/Sevenths`). Calculate the *actual* notes to be played using the current UI settings (apply inversion, add split note). Repeat the 7-step cycle `repetitions` times. Each step expects an array of MIDI notes.

## IV. Implementation Steps (Suggested Order)

1.  **State & Hook Setup:** Add state variables to `App.jsx`. Create basic `useDrill` hook structure with state management and `start/stop` functions.
2.  **Basic UI:** Add "Drills" sub-section and Start/Stop buttons to `Controls.jsx`. Pass necessary props.
3.  **Scale Drill - Generation:** Implement step generation logic for Scale mode within `useDrill`.
4.  **Scale Drill - Input & Keyboard:** Implement single-note checking in `useDrill`. Add new props to `PianoKeyboard` and implement highlighting for `expectedDrillNotes`. Forward MIDI events.
5.  **Keyboard Feedback (Correct/Incorrect):** Add `correct/incorrectPlayedNotes` highlighting to `PianoKeyboard` and logic to populate these in `useDrill`.
6.  **Scoring:** Implement basic correct/incorrect note counting. Display score in `Controls.jsx`.
7.  **Scale Drill - Options:** Add UI controls for scale options (octaves, reps, style) and integrate them into generation logic.
8.  **Chord Search Drill - Generation:** Implement step generation logic for Chord Search mode (handle roots, type, selected inversions, transposition).
9.  **Chord Search Drill - Input & Checking:** Implement logic in `useDrill` to check if the set of played notes matches the expected chord step. Update keyboard props.
10. **Chord Search Drill - Options:** Add UI controls for chord search options (octaves, inversions) and integrate.
11. **Diatonic Drill - Generation:** Implement step generation logic for Diatonic mode (use UI settings, cycle degrees).
12. **Diatonic Drill - Input & Checking:** Implement chord checking similar to Chord Search mode.
13. **Diatonic Drill - Options:** Add UI controls for diatonic options (repetitions).
14. **Refinement:** Improve UI, add polish, test edge cases.

## V. Future Considerations

*   Tempo/Rhythm constraints.
*   More complex drill patterns (arpeggios, intervals within scales).
*   Visual metronome synced with drills.
*   Saving high scores or tracking progress.
*   Different difficulty levels (e.g., stricter timing for chord recognition). 