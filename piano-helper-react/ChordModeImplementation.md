# Chord Progression Mode - Implementation Plan

## 1. Goal

To create a new mode in the Piano Helper application that allows users to:
*   Select common chord progressions.
*   View the selected progression transposed to the current key.
*   Practice playing the progression via MIDI input with feedback.

## 2. Core Features (Version 1)

*   **Mode Switching:** Integrate a way to select "Chord Progression Mode" within the existing application navigation/UI.
*   **Progression Selection:**
    *   Provide a UI element (e.g., dropdown, list) to choose from a predefined list of common chord progressions.
    *   Source: Hardcoded list initially, potentially stored in `src/data/progressions.json`. (Consider using progressions from `chord_progressions.md`).
*   **Progression Display:**
    *   Show the selected progression clearly on screen.
    *   Display both Roman numerals (e.g., I-V-vi-IV) and the specific chord names based on the currently selected key (e.g., C-G-Am-F for C Major).
    *   Consider highlighting the currently active chord, especially during drill mode.
*   **Transposition:** Automatically transpose the selected Roman numeral progression into the correct chords for the currently selected key.
*   **Drill Mode:**
    *   A button/toggle to start "Drill Mode" for the selected progression.
    *   Listen for MIDI input.
    *   Require the user to play the chords of the progression sequentially.
    *   Provide clear visual feedback for correct/incorrect chord input (e.g., highlighting the chord/notes, simple text confirmation).
    *   Advance to the next chord only after the current one is played correctly. (No timing/rhythm element initially).

## 3. Proposed Components

*   `ChordModeContainer`: Main component for this mode, managing state and orchestrating sub-components.
*   `ProgressionSelector`: Dropdown or list component for choosing a progression.
*   `ProgressionDisplay`: Component responsible for rendering the visual representation of the progression (Roman numerals, chord names). Might potentially interact with a shared virtual keyboard component if available.
*   `DrillController`: Handles the logic for the drill mode (MIDI input listening, validation, feedback, progression state).
*   **(Modify Existing):** Update main App/Mode switching logic to include the new mode. Update or integrate with any existing `KeySelector` component.

## 4. State Management

*   `currentKey`: (Likely exists elsewhere, need to integrate) The root note and scale (e.g., C Major).
*   `availableProgressions`: List of progressions loaded (e.g., from JSON).
*   `selectedProgression`: The currently chosen progression object/identifier.
*   `transposedChords`: An array of chord objects/names derived from `selectedProgression` and `currentKey`.
*   `isDrillModeActive`: Boolean flag.
*   `currentDrillStep`: Index indicating which chord in the progression is currently being drilled.
*   `lastMidiInput`: Store recent MIDI messages for chord validation.
*   `feedbackMessage`: String/state for displaying feedback (e.g., "Correct!", "Try again").

*Location:* State could potentially be managed within `ChordModeContainer` using hooks (`useState`, `useReducer`) initially. If complexity grows or state needs to be shared more broadly, consider React Context or a dedicated state management library.

## 5. Data Structures

*   **Progression:**
    ```json
    // Example: src/data/progressions.json
    [
      {
        "id": "p1",
        "name": "The Most Popular",
        "progression": ["I", "V", "vi", "IV"]
      },
      {
        "id": "p2",
        "name": "Pachelbel's Canon",
        "progression": ["I", "V", "vi", "iii", "IV", "I", "IV", "V"]
      }
      // ... more progressions
    ]
    ```
*   **Chord:** Need a way to represent individual chords internally, including root, quality (Major, minor, diminished), and potentially the specific notes. Libraries like `tonaljs` could be helpful here for generation and transposition, or implement basic logic manually.

## 6. Core Logic

*   **Transposition:** Function to take a Roman numeral (e.g., "V") and the `currentKey` (e.g., "C Major") and return the corresponding chord name/notes (e.g., "G Major"). Needs to handle different chord qualities (major, minor, diminished).
*   **MIDI Input Handling:** Process `note on` / `note off` messages to determine which notes are currently held down.
*   **Chord Recognition:** Compare the currently held notes (from MIDI) against the expected notes of the `currentDrillStep` chord. Needs to handle different inversions initially? (Simplest: require root position only).

## 7. Future Enhancements

*   User-defined progressions.
*   Support for different chord voicings and inversions in display and drill mode.
*   Rhythm elements in drill mode.
*   Scoring and progress tracking.
*   Visual feedback on a virtual keyboard display.
*   Adding 7th chords and other complexities.
*   Ability to play along *with* the progression (app plays chords).

## 8. Open Questions & Decisions

*   **Display:** Finalize the exact visual representation (Roman, Names, Keyboard?).
*   **Drill Feedback:** Define the specific visual/audio feedback for correct/incorrect attempts.
*   **Key Source:** Confirm integration with the existing key selection mechanism.
*   **Initial Progressions:** Confirm using the list from `chord_progressions.md` and storing in JSON.
*   **Chord Recognition:** Start with root position only for V1 drill?
*   **Libraries:** Use a music theory library (like `tonaljs`) or implement logic manually? (Manual might be fine for V1).

## 9. Future Enhancements (V1.x / V2)

*   **Progression Editor:** Allow users to create and save their own progressions.
*   **Import/Export:** Share progressions.
*   **More Complex Voicings:** 
    *   **Manual Inversions:** Allow selecting specific inversions for each chord in the progression display/drill (more complex state).
    *   **Split Hand Voicing (V1.x):**
        *   Option (checkbox) to play only the root note in the Left Hand (LH).
        *   Option (radio/select) for LH octave offset (e.g., 1 or 2 octaves below RH chord).
    *   **Rootless Right Hand (V1.x):**
        *   Option (checkbox) to remove the root note from the Right Hand (RH) chord, typically used with Split Hand voicing.
    *   **Shell Voicings (V1.x):**
        *   Option (checkbox) to keep only the Root, 3rd, and 7th of the chord (or R+3 for triads).
    *   **Add Upper Octave Root (V1.x):**
        *   Option (checkbox) to duplicate the root note one octave higher in the final voicing.
*   **Rhythm:** Incorporate rhythmic elements into the drill.
*   **More Scales/Modes:** Support for modes beyond major/minor in progressions.
*   **Chord Analysis:** Display more detailed analysis of the selected progression.
*   **Auto-Voicing / Voice Leading (V2):** Implement algorithms to suggest or enforce inversions that minimize finger movement between chords (Deferred due to complexity).

## 10. Open Questions / Decisions (Addressed)

*   Display Format: Roman + Chord Name + Notes.
*   Drill Feedback: Visual keyboard feedback initially.
*   Key/Scale Source: Use existing app settings.
*   Progression Storage: JSON file.
*   Initial Voicing: Root position triads/7ths.
*   Libraries: Use tonaljs (already integrated). 