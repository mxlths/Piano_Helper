import { useState, useEffect, useCallback, useRef } from 'react';
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
    ROOT_NOTES, // <-- Add ROOT_NOTES prop
    // Progression Props <-- NEW
    transposedProgressionChords // Array of { roman, name, notes, midiNotes }
}) {

    // Internal state for the hook (to be expanded)
    const [drillSequence, setDrillSequence] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [notesPlayedThisStep, setNotesPlayedThisStep] = useState({ correct: [], incorrect: [] });
    const [notesPlayedCurrentChordStep, setNotesPlayedCurrentChordStep] = useState(new Set());
    const [currentScore, setCurrentScore] = useState({ correctNotes: 0, incorrectNotes: 0 });

    // Ref to track the timestamp of the last processed MIDI event to prevent infinite loops
    const processedEventTimestampRef = useRef(null);

    // --- Core Functions (Placeholders) ---

    const generateDrillSequence = useCallback(() => {
        console.log('useDrill: Generating sequence for mode:', currentMode, 'with options:', drillOptions);
        
        // --- Perform validation inside generate function --- 
        let isValid = false;
        if (currentMode === 'scale_display') {
            const scaleData = Scale.get(scaleName);
            isValid = !scaleData.empty && scaleData.notes;
        } else if (currentMode === 'chord_search') {
            isValid = ROOT_NOTES && ROOT_NOTES.length > 0 && selectedChordType;
        } else if (currentMode === 'diatonic_chords') {
            isValid = calculatedDiatonicChordNotes && 
                      calculatedDiatonicChordNotes.length === 7 && 
                      calculatedDiatonicChordNotes.some(notes => Array.isArray(notes) && notes.length > 0);
        } else if (currentMode === 'chord_progression') {
            isValid = Array.isArray(transposedProgressionChords) && 
                      transposedProgressionChords.length > 0 && 
                      transposedProgressionChords.every(c => c && Array.isArray(c.midiNotes) && c.midiNotes.length > 0);
        }
        
        if (!isValid) {
            console.log("generateDrillSequence: Dependencies not valid, setting empty sequence.");
            setDrillSequence([]); 
            setCurrentStepIndex(0);
            // Reset other relevant state if needed
            return; // Exit generation early
        }
        // --- End Validation --- 
        
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
                    // --- Thirds Style Implementation ---
                    const scaleNotes = scaleData.notes;
                    const numNotes = scaleNotes.length;
                    const thirdsSequenceMidi = [];

                    if (numNotes > 0) {
                        for (let oct = 0; oct < octaves; oct++) {
                            const currentOctave = selectedOctave + oct;
                            for (let i = 0; i < numNotes; i++) {
                                const note1Name = scaleNotes[i];
                                const note2Index = (i + 2) % numNotes;
                                const note2Name = scaleNotes[note2Index];

                                // Determine octave for the second note (handle wrap-around)
                                const note2Octave = note2Index < i ? currentOctave + 1 : currentOctave;

                                const note1Midi = Note.midi(`${note1Name}${currentOctave}`);
                                const note2Midi = Note.midi(`${note2Name}${note2Octave}`);

                                if (note1Midi !== null) {
                                    thirdsSequenceMidi.push(note1Midi);
                                }
                                if (note2Midi !== null) {
                                    thirdsSequenceMidi.push(note2Midi);
                                }
                            }
                        }
                    }
                    orderedMidiNotes = thirdsSequenceMidi;
                    // --- End Thirds Style --- 
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
                // --- Diatonic Chord Drill Generation (Iterating through Octaves then Degrees) ---
                const { octaves = 1, repetitions = 1, style = 'ascending' } = drillOptions; // Get octaves/repetitions
                const chordSteps = []; // Holds steps for each degree/octave combo

                console.log(`useDrill: Entered diatonic_chords generation block. About to loop. Notes used:`, JSON.stringify(calculatedDiatonicChordNotes));

                // Iterate through OCTAVES first
                for (let octaveIndex = 0; octaveIndex < octaves; octaveIndex++) {
                     const octaveShift = 12 * octaveIndex; // Semitones to shift up for this octave

                    // Iterate through each degree's base chord notes WITHIN the current octave
                    calculatedDiatonicChordNotes.forEach((baseChordMidiNotes, degreeIndex) => {
                        if (!baseChordMidiNotes || baseChordMidiNotes.length === 0) {
                            console.warn(`useDrill: Skipping degree ${degreeIndex + 1} in octave ${octaveIndex + 1} due to missing/empty base notes.`);
                            return; // Skip this degree if notes are invalid/empty
                        }

                        const octaveChordNotes = baseChordMidiNotes.map(n => n + octaveShift);
                        
                         // Add the step for this degree's chord in this specific octave
                         chordSteps.push({
                            expectedMidiNotes: octaveChordNotes,
                            type: 'diatonic_chord',
                            degreeIndex: degreeIndex, // Store the degree index (0-based)
                            octaveIndex: octaveIndex // Store the octave index (0-based)
                         });
                    });
                 }

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
                
            } else if (currentMode === 'chord_progression') {
                // --- Chord Progression Drill Generation --- 
                const { repetitions = 1, style = 'ascending' } = drillOptions;
                const chordSteps = [];

                console.log(`useDrill: Generating progression drill sequence...`);

                // Create initial steps from the transposed chords
                transposedProgressionChords.forEach((chordInfo, index) => {
                    if (chordInfo && chordInfo.midiNotes && chordInfo.midiNotes.length > 0) {
                        chordSteps.push({
                            expectedMidiNotes: chordInfo.midiNotes, // Already calculated MIDI notes
                            type: 'progression_chord',
                            roman: chordInfo.roman, // Store original Roman numeral
                            name: chordInfo.name, // Store calculated chord name (e.g., "Am")
                            progressionIndex: index // Store index within the progression
                        });
                    } else {
                        console.warn(`useDrill: Skipping invalid chord data at index ${index} in progression.`);
                    }
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
        ROOT_NOTES, // <-- Add ROOT_NOTES to dependency array
        transposedProgressionChords // <-- Add progression chords dependency
    ]);

    // --- REMOVED processMidiInput function ---
    // const processMidiInput = useCallback(...);

    // Effect to process played notes when a new event arrives
    useEffect(() => {
        // Ignore if drill isn't active, event is null, or drill finished
        if (!isDrillActive || !playedNoteEvent || currentStepIndex >= drillSequence.length) return;
        
        // --- Prevent re-processing the same event --- 
        if (playedNoteEvent.timestamp === processedEventTimestampRef.current) {
            // console.log("useDrill: Skipping re-processing of event timestamp:", playedNoteEvent.timestamp); 
            return; 
        }

        // Check if the event is a noteon event before processing
        if (playedNoteEvent.type !== 'noteon') return; // Only process noteon for scoring
        
        console.log("useDrill: Processing noteon event:", playedNoteEvent);

        const midiNoteNumber = playedNoteEvent.note;
        console.log(`useDrill useEffect[playedNoteEvent]: Processing note ON ${midiNoteNumber}`);

        const currentStep = drillSequence[currentStepIndex];
        if (!currentStep || !currentStep.expectedMidiNotes || currentStep.expectedMidiNotes.length === 0) {
            console.warn("useDrill: Invalid current step data.");
            return;
        }

        // --- Updated Drill Logic --- 
        // Define stepType and expectedNotes FIRST
        const expectedNotes = currentStep.expectedMidiNotes;
        const stepType = currentStep.type;
        // NOW log it
        console.log(`useDrill: Checking step type: ${stepType}`);

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
        } else if (stepType === 'diatonic_chord' || stepType === 'chord_search_target' || stepType === 'progression_chord') {
            // --- Chord Logic (Applies to both Diatonic and Chord Search steps) --- 
            const expectedNotesSet = new Set(expectedNotes);

            console.log(`useDrill ChordLogic: Checking note ${midiNoteNumber} against expected set:`, expectedNotesSet, `Current played set:`, notesPlayedCurrentChordStep);
            
            if (expectedNotesSet.has(midiNoteNumber)) {
                // Played a correct note for the current chord
                const updatedPlayedNotes = new Set(notesPlayedCurrentChordStep).add(midiNoteNumber);
                setNotesPlayedCurrentChordStep(updatedPlayedNotes);
                console.log(`useDrill: Correct note for chord played: ${midiNoteNumber}. Need ${expectedNotes.length}, have ${updatedPlayedNotes.size}`);

                // Check if chord is complete
                if (updatedPlayedNotes.size === expectedNotes.length) {
                    console.log(`useDrill: Chord complete! Expected: [${expectedNotes.join(', ')}]`);
                    console.log("useDrill: Incrementing CORRECT score.");
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
                 console.log(`useDrill ChordLogic: Incorrect note ${midiNoteNumber}. Expected one of: [${expectedNotes.join(', ')}]. Current played set:`, notesPlayedCurrentChordStep);
                 console.log("useDrill: Incrementing INCORRECT score.");
                 setCurrentScore(prev => ({ ...prev, incorrectNotes: prev.incorrectNotes + 1 }));
                 // Do not advance step on incorrect note
            }
        }
        // --- End Updated Drill Logic ---

        // Mark this event timestamp as processed AFTER all logic is done
        processedEventTimestampRef.current = playedNoteEvent.timestamp;

    }, [playedNoteEvent, isDrillActive, drillSequence, currentStepIndex, notesPlayedCurrentChordStep]); // Ensure dependencies are correct

    // --- Effects ---

    // Effect to generate sequence ONLY when drill becomes active OR dependencies change
    useEffect(() => {
        if (isDrillActive) {
            console.log("useDrill Effect: Drill active, calling generateDrillSequence.");
            generateDrillSequence();
        } else {
            // Drill stopped or became inactive
            if (drillSequence.length > 0) { 
                console.log("useDrill Effect: Drill stopped or inactive, clearing sequence.");
                setDrillSequence([]); 
                setCurrentStepIndex(0);
                setNotesPlayedThisStep({ correct: [], incorrect: [] });
                setNotesPlayedCurrentChordStep(new Set());
                setCurrentScore({ correctNotes: 0, incorrectNotes: 0 });
            }
        }
    }, [isDrillActive, generateDrillSequence]); 
    
    // We rely on generateDrillSequence being a useCallback with correct dependencies.
    // Now, if its dependencies change WHILE the drill is active, this effect will re-run
    // and call the updated generateDrillSequence, regenerating the sequence.
    // When the drill STARTS (isDrillActive flips true), this effect also runs,
    // calling the generateDrillSequence created during *that same render cycle*, 
    // ensuring it has the latest props like calculatedDiatonicChordNotes.

    // --- Output / Return Value ---

    const currentStepData = drillSequence[currentStepIndex] || { expectedMidiNotes: [], type: null, stepIndex: 0, totalSteps: 0 }; 

    // Calculate Step Label for display
    let stepLabel = '';
    if (currentStepData && currentStepData.type) {
        const stepType = currentStepData.type;
        const octaveIndex = currentStepData.octaveIndex || 0; // Default to 0 if not present
        const actualOctave = selectedOctave + octaveIndex;

        if (stepType === 'note') {
            stepLabel = Note.fromMidi(currentStepData.expectedMidiNotes[0]);
        } else if (stepType === 'chord_search_target') {
            const root = currentStepData.rootNote;
            stepLabel = `${root}${selectedChordType || ''} (Octave ${actualOctave})`; // Add safety check for selectedChordType
        } else if (stepType === 'diatonic_chord') {
            const targetChords = showSevenths ? diatonicSevenths : diatonicTriads;
            const degreeIndex = currentStepData.degreeIndex;
            const chordName = (targetChords && targetChords[degreeIndex]) ? targetChords[degreeIndex] : 'Unknown Chord';
            stepLabel = `${chordName} (Octave ${actualOctave})`;
        } else if (stepType === 'progression_chord') {
            // Use the chord name stored in the step data
            stepLabel = currentStepData.name || 'Prog Chord?'; 
        }
    }

    const currentStepOutput = {
        ...currentStepData,
        stepLabel: stepLabel, // Add the calculated label
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