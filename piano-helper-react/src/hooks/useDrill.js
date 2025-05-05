import { useState, useEffect, useCallback } from 'react';
import { Note, Scale, Chord } from '@tonaljs/tonal';

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

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
    selectedRootNote, // <-- Need root note for chord search generation
    ROOT_NOTES // <-- Add ROOT_NOTES prop
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
                
                // --- Apply Style (Order) ---
                let orderedMidiNotes = [...midiNotes]; // Create a copy
                if (style === 'ascending') {
                    orderedMidiNotes.sort((a, b) => a - b); 
                } else if (style === 'descending') {
                    orderedMidiNotes.sort((a, b) => b - a); 
                } else if (style === 'random') {
                    orderedMidiNotes = shuffleArray(orderedMidiNotes);
                } else if (style === 'thirds') {
                    // TODO: Implement specific logic for playing scale notes IN thirds (1,3,2,4,3,5...)
                    // For now, treat as ascending
                    orderedMidiNotes.sort((a, b) => a - b);
                    console.warn("useDrill: 'Thirds' style for scales not fully implemented yet.");
                }
                // --- End Style --- 

                // --- Apply Repetitions ---
                let fullSequenceNotes = []; 
                for (let i = 0; i < repetitions; i++) {
                    fullSequenceNotes.push(...orderedMidiNotes);
                }
                // --- End Repetitions ---

                // Format into step objects
                generatedSequence = fullSequenceNotes.map((note) => ({
                    expectedMidiNotes: [note], // Scale drill expects one note at a time
                    type: 'note' 
                }));

            } else if (currentMode === 'chord_search') {
                // --- Chord Search Drill Generation (Iterating through Roots & Octaves) ---
                console.log("useDrill: Generating sequence for Chord Search mode (all roots)...");
                // Get octave range and repetitions from options
                const { octaves = 1, repetitions = 1 } = drillOptions;
                const chordSteps = []; // Array to hold the steps for each root/octave combo

                if (!ROOT_NOTES || ROOT_NOTES.length === 0) {
                    console.error("useDrill: ROOT_NOTES array is missing or empty.");
                    setDrillSequence([]); return;
                }
                if (!selectedChordType) {
                     console.error("useDrill: selectedChordType is missing.");
                     setDrillSequence([]); return;
                }

                for (const root of ROOT_NOTES) {
                    const rootWithOctave = `${root}${selectedOctave}`; // Base octave
                    let baseChordMidiNotes = [];

                    try {
                        const chordData = Chord.getChord(selectedChordType, rootWithOctave);
                        if (chordData.empty || !Array.isArray(chordData.notes) || chordData.notes.length === 0) {
                            console.warn(`useDrill: Could not get valid notes for chord ${selectedChordType} at ${rootWithOctave}`);
                            continue; // Skip this root 
                        }
                        
                        let chordNotes = chordData.notes; // Note names with correct octave

                        // Apply RH Inversion (same logic as before)
                        if (rhInversion > 0 && rhInversion < chordNotes.length) {
                            const inversionSlice = chordNotes.slice(0, rhInversion);
                            const remainingSlice = chordNotes.slice(rhInversion);
                            const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P'));
                            chordNotes = [...remainingSlice, ...invertedNotes];
                        }

                        baseChordMidiNotes = chordNotes.map(Note.midi).filter(Boolean).sort((a,b) => a-b);

                        if (baseChordMidiNotes.length === 0) {
                             console.warn(`useDrill: No valid MIDI notes after inversion/conversion for ${selectedChordType} at ${rootWithOctave}`);
                             continue; // Skip this root
                        }

                        // --- Octave Loop --- 
                        // Generate steps for this chord across the specified octave range
                        for (let octaveIndex = 0; octaveIndex < octaves; octaveIndex++) {
                             const octaveShift = 12 * octaveIndex; // Semitones to shift up
                             const octaveChordNotes = baseChordMidiNotes.map(n => n + octaveShift);
                             
                             // Add the step for this root's chord in this specific octave
                             chordSteps.push({
                                expectedMidiNotes: octaveChordNotes,
                                type: 'chord_search_target',
                                rootNote: root, // Store the original root note
                                octaveIndex: octaveIndex // Store the octave index (0-based)
                             });
                        }
                        // --- End Octave Loop ---

                    } catch (error) {
                        console.error(`useDrill: Error getting chord notes for ${selectedChordType} at ${rootWithOctave}:`, error);
                         continue; // Skip this root on error
                    }
                }

                // --- Apply Style (Order) --- 
                let orderedChordSteps = [...chordSteps]; // Create copy
                const { style } = drillOptions;
                if (style === 'descending') {
                    orderedChordSteps.reverse();
                } else if (style === 'random') {
                    orderedChordSteps = shuffleArray(orderedChordSteps);
                } // 'ascending' is default, 'thirds' not applicable here
                // --- End Style ---

                // --- Apply Repetitions ---
                generatedSequence = [];
                for (let i = 0; i < repetitions; i++) {
                    generatedSequence.push(...orderedChordSteps);
                }
                // --- End Repetitions ---

            } else if (currentMode === 'diatonic_chords') {
                // --- Diatonic Chord Drill Generation (Iterating through Degrees & Octaves) ---
                const { octaves = 1, repetitions = 1, style = 'ascending' } = drillOptions; // Get octaves/repetitions
                const chordSteps = []; // Holds steps for each degree/octave combo

                if (!calculatedDiatonicChordNotes || calculatedDiatonicChordNotes.length === 0) {
                    // Allow empty array if calculation failed gracefully, but check length > 0
                    console.warn(`useDrill: Invalid or empty pre-calculated diatonic chord notes received.`);
                    setDrillSequence([]); return;
                }

                // Iterate through each degree's base chord notes (already calculated in App.jsx)
                calculatedDiatonicChordNotes.forEach((baseChordMidiNotes, degreeIndex) => {
                    if (!baseChordMidiNotes || baseChordMidiNotes.length === 0) {
                        console.warn(`useDrill: Skipping degree ${degreeIndex + 1} due to missing/empty notes.`);
                        return; // Skip this degree if notes are invalid/empty
                    }

                    // --- Octave Loop --- 
                    // Generate steps for this degree's chord across the specified octave range
                    for (let octaveIndex = 0; octaveIndex < octaves; octaveIndex++) {
                         const octaveShift = 12 * octaveIndex; // Semitones to shift up
                         const octaveChordNotes = baseChordMidiNotes.map(n => n + octaveShift);
                         
                         // Add the step for this degree's chord in this specific octave
                         chordSteps.push({
                            expectedMidiNotes: octaveChordNotes,
                            type: 'diatonic_chord',
                            degreeIndex: degreeIndex, // Store the degree index (0-based)
                            octaveIndex: octaveIndex // Store the octave index (0-based)
                         });
                    }
                    // --- End Octave Loop ---
                });

                // --- Apply Style (Order) --- 
                let orderedChordSteps = [...chordSteps]; // Create copy
                if (style === 'descending') {
                    orderedChordSteps.reverse();
                } else if (style === 'random') {
                    orderedChordSteps = shuffleArray(orderedChordSteps);
                } // 'ascending' is default, 'thirds' not applicable here
                // --- End Style ---

                // --- Apply Repetitions ---
                generatedSequence = [];
                for (let i = 0; i < repetitions; i++) {
                    generatedSequence.push(...orderedChordSteps);
                }
                // --- End Repetitions ---
                
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
        selectedRootNote, // <-- Need root note for chord search generation
        ROOT_NOTES // <-- Add ROOT_NOTES to dependency array
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