import { useState, useEffect, useCallback } from 'react';
import { Note, Scale, Chord } from '@tonaljs/tonal';

function useDrill({
    // Props we'll likely need from App.jsx 
    isDrillActive,
    currentMode,
    drillOptions, // Contains user selections: { octaves: 1, repetitions: 1, style: 'ascending' } etc.
    scaleName, // From App context
    selectedChordType, // From App context
    diatonicTriads, // From App context
    diatonicSevenths, // From App context
    selectedOctave, // <-- Added prop
    // Diatonic UI settings needed for diatonic drills
    showSevenths,
    splitHandVoicing,
    splitHandInterval,
    rhInversion,
    playedNoteEvent, // <-- New prop to receive latestNoteOn event
    calculatedDiatonicChordNotes, // <-- New prop with pre-calculated notes
    selectedRootNote // <-- Need root note for chord search generation
}) {

    // Internal state for the hook (to be expanded)
    const [drillSequence, setDrillSequence] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [notesPlayedThisStep, setNotesPlayedThisStep] = useState({ correct: [], incorrect: [] });
    const [notesPlayedCurrentChordStep, setNotesPlayedCurrentChordStep] = useState(new Set());
    const [currentScore, setCurrentScore] = useState({ correctNotes: 0, incorrectNotes: 0 });

    // --- Core Functions (Placeholders) ---

    const generateDrillSequence = useCallback(() => {
        console.log('useDrill: Generating sequence for mode:', currentMode, 'with options:', drillOptions);
        let generatedSequence = [];

        try {
            if (currentMode === 'scale_display') {
                // --- Scale Drill Generation ---
                const { octaves = 1, repetitions = 1, style = 'ascending' } = drillOptions;
                const scaleData = Scale.get(scaleName);
                
                if (scaleData.empty || !scaleData.notes) {
                    console.warn(`useDrill: Could not get scale data for ${scaleName}`);
                    setDrillSequence([]); return;
                }

                let midiNotes = [];
                for (let oct = 0; oct < octaves; oct++) {
                    const currentOctave = selectedOctave + oct;
                    const octaveNotes = scaleData.notes
                        .map(noteName => Note.midi(`${noteName}${currentOctave}`))
                        .filter(n => n !== null); // Filter out potential nulls
                    midiNotes.push(...octaveNotes);
                }
                
                // TODO: Implement other styles (descending, thirds, etc.)
                if (style === 'ascending') {
                   midiNotes.sort((a, b) => a - b); // Simple sort for ascending
                } else if (style === 'descending') {
                    midiNotes.sort((a, b) => b - a); // Sort descending
                } // Add more style handling here

                let fullSequenceNotes = [];
                for (let i = 0; i < repetitions; i++) {
                   fullSequenceNotes.push(...midiNotes);
                }

                // Format into step objects
                generatedSequence = fullSequenceNotes.map((note) => ({
                    expectedMidiNotes: [note], // Scale drill expects one note at a time
                    type: 'note' 
                }));

            } else if (currentMode === 'chord_search') {
                // --- Chord Search Drill Generation ---
                console.log("useDrill: Generating sequence for Chord Search mode...");
                const { repetitions = 1 } = drillOptions;
                const rootWithOctave = `${selectedRootNote}${selectedOctave}`;
                let targetChordNotes = [];

                try {
                    const chordData = Chord.getChord(selectedChordType, rootWithOctave);
                    if (chordData.empty || !Array.isArray(chordData.notes) || chordData.notes.length === 0) {
                        console.warn(`useDrill: Could not get valid notes for chord ${selectedChordType} at ${rootWithOctave}`);
                        setDrillSequence([]); return;
                    }
                    
                    let chordNotes = chordData.notes; // Note names with correct octave

                    // Apply RH Inversion (similar to App.jsx)
                    if (rhInversion > 0 && rhInversion < chordNotes.length) {
                        const inversionSlice = chordNotes.slice(0, rhInversion);
                        const remainingSlice = chordNotes.slice(rhInversion);
                        const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P'));
                        chordNotes = [...remainingSlice, ...invertedNotes];
                    }

                    targetChordNotes = chordNotes.map(Note.midi).filter(Boolean).sort((a,b) => a-b);

                    if (targetChordNotes.length === 0) {
                         console.warn(`useDrill: No valid MIDI notes after inversion/conversion for ${selectedChordType} at ${rootWithOctave}`);
                         setDrillSequence([]); return;
                    }

                } catch (error) {
                    console.error(`useDrill: Error getting chord notes for ${selectedChordType} at ${rootWithOctave}:`, error);
                     setDrillSequence([]); return;
                }
                
                const step = {
                    expectedMidiNotes: targetChordNotes,
                    type: 'chord_search_target'
                };

                generatedSequence = Array(repetitions).fill(step); // Repeat the same chord step

            } else if (currentMode === 'diatonic_chords') {
                // --- Diatonic Chord Drill Generation ---
                const { repetitions = 1, style = 'ascending' } = drillOptions; // Add style later
                
                if (!calculatedDiatonicChordNotes || calculatedDiatonicChordNotes.length !== 7) {
                    console.warn(`useDrill: Invalid pre-calculated diatonic chord notes received.`);
                    setDrillSequence([]); return;
                }

                let baseSequence = calculatedDiatonicChordNotes.map(notes => ({
                    expectedMidiNotes: notes, // Already calculated MIDI notes
                    type: 'diatonic_chord'
                })); 
                
                // TODO: Implement different styles (random, specific degrees etc.)
                // For now, just use ascending order

                let fullSequence = [];
                for (let i = 0; i < repetitions; i++) {
                   fullSequence.push(...baseSequence);
                }
                generatedSequence = fullSequence;
                
            } else {
                console.warn(`useDrill: Unknown drill mode: ${currentMode}`);
                generatedSequence = [];
            }

        } catch (error) {
            console.error("useDrill: Error generating drill sequence:", error);
            generatedSequence = []; // Reset on error
        }
        
        console.log(`useDrill: Generated ${generatedSequence.length} steps.`);
        setDrillSequence(generatedSequence);
        setCurrentStepIndex(0);
        setNotesPlayedThisStep({ correct: [], incorrect: [] });
        setNotesPlayedCurrentChordStep(new Set());
        setCurrentScore({ correctNotes: 0, incorrectNotes: 0 });

    }, [
        currentMode, drillOptions, scaleName, selectedOctave, /* other dependencies... */ 
        selectedChordType, diatonicTriads, diatonicSevenths, 
        showSevenths, splitHandVoicing, splitHandInterval, rhInversion,
        calculatedDiatonicChordNotes, // <-- Add new prop to dependencies
        selectedRootNote // <-- Need root note for chord search generation
    ]);

    // --- REMOVED processMidiInput function ---
    // const processMidiInput = useCallback(...);

    // Effect to process played notes when a new event arrives
    useEffect(() => {
        // Ignore if drill isn't active, event is null, or drill finished
        if (!isDrillActive || !playedNoteEvent || currentStepIndex >= drillSequence.length) {
            return; 
        }

        const midiNoteNumber = playedNoteEvent.note;
        console.log(`useDrill useEffect[playedNoteEvent]: Processing note ${midiNoteNumber}`);

        const currentStep = drillSequence[currentStepIndex];
        if (!currentStep || !currentStep.expectedMidiNotes || currentStep.expectedMidiNotes.length === 0) {
            console.warn("useDrill: Invalid current step data.");
            return;
        }

        // --- Updated Drill Logic --- 
        const expectedNotes = currentStep.expectedMidiNotes;
        const stepType = currentStep.type;

        if (stepType === 'note') {
            // --- Single Note Logic --- 
            const expectedNote = expectedNotes[0]; 
            if (midiNoteNumber === expectedNote) {
                console.log(`useDrill: Correct note played! Expected: ${expectedNote}, Got: ${midiNoteNumber}`);
                setCurrentScore(prev => ({ ...prev, correctNotes: prev.correctNotes + 1 }));
                const nextStepIndex = currentStepIndex + 1;
                if (nextStepIndex < drillSequence.length) {
                    setCurrentStepIndex(nextStepIndex);
                    console.log(`useDrill: Advancing to step ${nextStepIndex}`);
                } else {
                    console.log("useDrill: Drill sequence completed!");
                    setCurrentStepIndex(nextStepIndex); 
                }
            } else {
                console.log(`useDrill: Incorrect note played. Expected: ${expectedNote}, Got: ${midiNoteNumber}`);
                setCurrentScore(prev => ({ ...prev, incorrectNotes: prev.incorrectNotes + 1 }));
            }
        } else if (stepType === 'diatonic_chord' || stepType === 'chord_search_target') {
            // --- Chord Logic (Applies to both Diatonic and Chord Search steps) --- 
            const expectedNotesSet = new Set(expectedNotes);

            if (expectedNotesSet.has(midiNoteNumber)) {
                // Played a correct note for the current chord
                const updatedPlayedNotes = new Set(notesPlayedCurrentChordStep).add(midiNoteNumber);
                setNotesPlayedCurrentChordStep(updatedPlayedNotes);
                console.log(`useDrill: Correct note for chord played: ${midiNoteNumber}. Need ${expectedNotes.length}, have ${updatedPlayedNotes.size}`);

                // Check if chord is complete
                if (updatedPlayedNotes.size === expectedNotes.length) {
                    console.log(`useDrill: Chord complete! Expected: [${expectedNotes.join(', ')}]`);
                    setCurrentScore(prev => ({ ...prev, correctNotes: prev.correctNotes + 1 })); // Score 1 point per completed chord
                    
                    const nextStepIndex = currentStepIndex + 1;
                    if (nextStepIndex < drillSequence.length) {
                         setCurrentStepIndex(nextStepIndex);
                         setNotesPlayedCurrentChordStep(new Set()); // Reset for next chord step
                         console.log(`useDrill: Advancing to chord step ${nextStepIndex}`);
                    } else {
                         console.log("useDrill: Drill sequence completed!");
                         setCurrentStepIndex(nextStepIndex); 
                    }
                }
                // else: Chord not yet complete, wait for more notes

            } else {
                // Played an incorrect note (not part of the current chord)
                 console.log(`useDrill: Incorrect note for chord. Expected one of: [${expectedNotes.join(', ')}], Got: ${midiNoteNumber}`);
                 setCurrentScore(prev => ({ ...prev, incorrectNotes: prev.incorrectNotes + 1 }));
                 // Do not advance step on incorrect note
            }
        }
        // --- End Updated Drill Logic ---

    }, [playedNoteEvent, isDrillActive, drillSequence, currentStepIndex]); // Dependencies for the effect

    // --- Effects ---

    // Effect to generate sequence when drill starts or options change
    useEffect(() => {
        if (isDrillActive) {
            generateDrillSequence();
        } else {
            setDrillSequence([]); // Clear sequence when drill stops
        }
    }, [isDrillActive, generateDrillSequence]);

    // --- Output / Return Value ---

    const currentStepData = drillSequence[currentStepIndex] || { expectedMidiNotes: [], type: null, stepIndex: 0, totalSteps: 0 }; 
    const currentStepOutput = {
       ...currentStepData,
       totalSteps: drillSequence.length
    };

    return {
        currentDrillStep: currentStepOutput, 
        drillScore: currentScore,
        notesPlayedThisStep, // For keyboard feedback
        // Functions to be called by App.jsx (if needed, or managed via props like isDrillActive)
        // startDrill, stopDrill etc. might be implicitly handled by changing isDrillActive prop
    };
}

export default useDrill; 