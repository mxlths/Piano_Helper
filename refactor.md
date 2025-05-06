Sor # Piano Helper - React Refactoring Plan

**Version:** 1.0
**Date:** 2024-07-27

**1. Goal**

Migrate the Piano Helper application from its current p5.js-based implementation to a native React application. The primary aim is to resolve MIDI initialization issues encountered on iOS (specifically with the WebMIDI Browser) and establish a more robust and scalable architecture for future development.

**2. Reasoning**

*   **iOS MIDI Stability:** The current p5.js implementation, even when using the `webmidi.js` library, fails to initialize correctly or detect devices within the target iOS WebMIDI Browser, hanging during the `WebMidi.enable()` call. A working example (`midi-monitor`) built with React successfully handles MIDI in the same environment, suggesting React's component lifecycle and rendering context may be more compatible.
*   **Improved UI/State Management:** As features grow, React's component model, declarative UI updates, and established state management patterns (Hooks, Context, potentially Zustand/Redux later) will be more suitable for handling application complexity than the current mix of global p5.js variables and manual DOM manipulation.
*   **Maintainability & Collaboration:** A standard React project structure will be more familiar to other developers (including collaborators) and aligns better with modern web development practices.
*   **Leverage React Ecosystem:** Access to React-specific libraries for routing, animation, UI components, etc., if needed in the future.

**3. Proposed Technology Stack**

*   **Framework:** React
*   **Build Tool:** Vite (Fast setup and development server)
*   **Language:** JavaScript (Can switch to TypeScript if preferred)
*   **Music Theory:** `Tonal.js` (Continue using or integrate more deeply)
*   **MIDI:** Web MIDI API via `webmidi.js` library (Integrated within React hooks/context)
*   **Graphics/Drawing:** Native HTML Canvas API (for the piano keyboard) or SVG
*   **Audio:** Native Web Audio API or `Tone.js` (for metronome and potential future audio)
*   **Styling:** CSS Modules, Plain CSS, or Styled Components (TBD)

**4. Refactoring Steps & Plan**

1.  **Project Setup:**
    *   Initialize a new React project using Vite (`npm create vite@latest piano-helper-react --template react`).
    *   Install necessary initial dependencies (`npm install tonal webmidi`).
    *   Basic cleanup of default Vite template files.

2.  **Component Structure:**
    *   Create basic functional components for the main UI sections:
        *   `App.jsx`: Main application container.
        *   `Controls.jsx`: Holds dropdowns, buttons (initially placeholders).
        *   `InfoDisplay.jsx`: Displays scale/chord names, formulas.
        *   `MidiMonitorDisplay.jsx`: Displays logs and detected devices.
        *   `PianoKeyboard.jsx`: Will contain the Canvas element for the keyboard.

3.  **State Management Setup:**
    *   Use React Hooks (`useState`, `useReducer`) initially within `App.jsx` to manage the core application state identified in `design.md` (mode, selected root/scale/chord, device IDs, etc.).
    *   Consider React Context or Zustand later if state management becomes complex or needs sharing across deeply nested components.

4.  **Integrate `MusicLogic` / `Tonal.js`:**
    *   Copy the existing `musicLogic.js` file into the new project's `src` directory.
    *   Import and use `musicLogic` functions within components (e.g., in `App.jsx` or `InfoDisplay.jsx`) to calculate notes based on selected state.

5.  **Refactor `MidiHandler` -> React Hook/Context:**
    *   Create a custom React Hook (e.g., `useMidi.js`) or a React Context provider to encapsulate MIDI logic.
    *   Adapt the `webmidi.js`-based `MidiHandler` code:
        *   Call `WebMidi.enable()` within a `useEffect` hook (triggered once on mount).
        *   Manage device lists (`inputs`, `outputs`) using React state (`useState`) within the hook/context.
        *   Use `useEffect` to add/remove `webmidi.js` listeners (`connected`, `disconnected`).
        *   Expose device lists, selected device state, and selection functions (`selectInput`, `selectOutput`) from the hook/context.
        *   Handle incoming MIDI messages and update state or call callbacks provided by components.
    *   Implement the logging mechanism to update the `MidiMonitorDisplay` component.

6.  **Refactor `DisplayManager` -> `PianoKeyboard` Component:**
    *   In `PianoKeyboard.jsx`, create a `<canvas>` element.
    *   Use the `useRef` hook to get a reference to the canvas.
    *   Use a `useEffect` hook (dependent on `notesToHighlight`, `rootNote`, `range` props) to:
        *   Get the 2D rendering context (`canvasRef.current.getContext('2d')`).
        *   Re-implement the drawing logic from `displayManager.js` using **native Canvas API methods** (e.g., `ctx.fillRect()`, `ctx.strokeRect()`, `ctx.fillStyle`).
        *   Clear the canvas before each redraw.

7.  **Refactor `MetronomeEngine` -> React Hook / Web Audio / Tone.js:**
    *   Create a custom hook (e.g., `useMetronome.js`).
    *   Re-implement timing logic using `setInterval` or `requestAnimationFrame`.
    *   Replace `p5.sound` oscillator with native **Web Audio API** (`AudioContext`, `OscillatorNode`, `GainNode`) or integrate **`Tone.js`** for more robust scheduling and sound generation.
    *   Manage metronome state (`isPlaying`, `bpm`, `accentType`) within the hook using `useState`.
    *   Provide functions to `start()`, `stop()`, `setTempo()`, etc.
    *   Integrate with the MIDI hook/context to send MIDI clock/note messages if an output is selected.

8.  **Connect Components & State:**
    *   Wire up the state managed in `App.jsx` (or context) as props to child components (`Controls`, `InfoDisplay`, `PianoKeyboard`).
    *   Pass callback functions (e.g., `handleRootChange`, `handleScaleChange`, `handleMidiInputChange`) from `App.jsx` down to `Controls` to update the central state.
    *   Ensure the `PianoKeyboard` re-renders correctly when the highlighted notes change.
    *   Connect the MIDI hook/context to the `Controls` component to populate device dropdowns and handle selections.
    *   Connect the Metronome hook to the `Controls` component for start/stop/tempo controls.

9.  **Styling:**
    *   Apply basic CSS for layout and appearance. Choose a consistent styling approach (CSS Modules recommended for component scoping).

**5. Timeline / Remaining Tasks (High-Level)**

*   [ ] **Phase 1: Setup & Core Structure**
    *   [ ] Set up React project with Vite.
    *   [ ] Create basic placeholder components (`App`, `Controls`, `InfoDisplay`, `MidiMonitorDisplay`, `PianoKeyboard`).
    *   [ ] Implement basic state management in `App.jsx` for mode, root, scale/chord type.
    *   [ ] Integrate `MusicLogic`/`Tonal.js` to display basic scale/chord info in `InfoDisplay`.
*   [ ] **Phase 2: MIDI Integration**
    *   [ ] Refactor `MidiHandler` logic into `useMidi` Hook/Context using `webmidi.js`.
    *   [ ] Implement MIDI device listing and logging in `MidiMonitorDisplay`.
    *   [ ] Populate device selection dropdowns in `Controls`.
    *   [ ] Handle device selection and basic incoming message logging.
*   [ ] **Phase 3: Piano Display**
    *   [ ] Implement canvas drawing logic within `PianoKeyboard` component using native Canvas API.
    *   [ ] Connect `PianoKeyboard` props to application state to highlight notes.
*   [ ] **Phase 4: Metronome**
    *   [ ] Refactor `MetronomeEngine` into `useMetronome` Hook using Web Audio API or Tone.js.
    *   [ ] Implement metronome controls in `Controls` component.
    *   [ ] Add MIDI output functionality to the metronome.
*   [ ] **Phase 5: Refinement & Styling**
    *   [ ] Apply CSS styling for a clean UI.
    *   [ ] Add interactivity (e.g., clicking piano keys).
    *   [ ] Testing and bug fixing, especially on iOS target.

This provides a structured approach. We can tackle these phases sequentially. 