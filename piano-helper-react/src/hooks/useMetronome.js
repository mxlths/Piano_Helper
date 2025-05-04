import { useState, useEffect, useRef, useCallback, useContext } from 'react';
// We might need MidiContext if sendMessage isn't passed down directly
// import { MidiContext } from '../contexts/MidiContext'; // Adjust path if needed

// Define metronome sounds (MIDI note numbers for channel 10)
const METRONOME_SOUNDS = {
  SideStick: 37,
  HighWoodBlock: 76,
  LowWoodBlock: 77,
  HighAgogo: 67,
  Cowbell: 56,
  Claves: 75,
  HighTimbale: 65,
  LowTimbale: 66,
  Maracas: 70,
  LowAgogo: 68,
  MuteTriangle: 80,
  OpenTriangle: 81,
};

const DEFAULT_BPM = 120;
const DEFAULT_SOUND_NOTE = METRONOME_SOUNDS.HighWoodBlock;
const DEFAULT_TIME_SIGNATURE = '4/4'; // Default to 4/4
const MIDI_CHANNEL = 9; // MIDI channels are 0-15, so channel 10 is 9
const NOTE_ON_CMD = 0x90 | MIDI_CHANNEL; // Keep for reference, but won't use directly
const NOTE_OFF_CMD = 0x80 | MIDI_CHANNEL; // Keep for reference, but won't use directly
const DEFAULT_VELOCITY = 100;
const ACCENT_VELOCITY = 127; // Accent velocity
const NOTE_DURATION_MS = 50; // How long the note 'on' message lasts virtually

function useMetronome(sendMessage) { // Accept sendMessage as a prop/argument
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [selectedSoundNote, setSelectedSoundNote] = useState(DEFAULT_SOUND_NOTE);
  const [timeSignature, setTimeSignature] = useState(DEFAULT_TIME_SIGNATURE);
  const [currentBeat, setCurrentBeat] = useState(0); // Track the current beat in the measure

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null); // Ref for the Note Off timeout

  // Use sendMessage from props/context
  // const { sendMessage } = useContext(MidiContext); // Example if using context

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0); // Reset beat count on stop
     // Optionally send an immediate Note Off for the last played note
    if (sendMessage && selectedSoundNote) {
         try {
             sendMessage([NOTE_OFF_CMD, selectedSoundNote, 0]);
         } catch (e) {
             console.error("Error sending final Note Off:", e);
         }
    }
    console.log('Metronome stopped');
  }, [sendMessage, selectedSoundNote]);

  const startMetronome = useCallback(() => {
    // Check if sendMessage exists and is a function, though we won't use it for notes
    if (isPlaying || typeof sendMessage !== 'function') { 
        console.warn("Metronome cannot start: isPlaying or sendMessage invalid");
        return;
    }

    console.log(`Starting metronome: BPM=${bpm}, Sound=${selectedSoundNote}, TimeSig=${timeSignature}`);
    setIsPlaying(true);
    setCurrentBeat(0); // Reset beat count on start
    stopMetronome(); // Clear any existing interval/timeouts first

    const intervalMs = (60 / bpm) * 1000;

    let beatsPerMeasure = Infinity; 
    if (timeSignature === '3/4') beatsPerMeasure = 3;
    else if (timeSignature === '4/4') beatsPerMeasure = 4;

    intervalRef.current = setInterval(() => {
      // Increment beat count using functional update
      setCurrentBeat(prevBeat => (prevBeat % beatsPerMeasure) + 1);
      
      // Read latest state directly inside interval if needed, or rely on closure (like timeSignature)
      // Determine velocity based on accent (using timeSignature from closure)
      let velocity = DEFAULT_VELOCITY;
      // Read beat *after* update (can use a ref or read from state, functional update safer)
      setCurrentBeat(prevBeat => { // Use functional update to get latest beat
          const nextBeat = (prevBeat % beatsPerMeasure) + 1;
           if (nextBeat === 1 && (timeSignature === '3/4' || timeSignature === '4/4')) {
              velocity = ACCENT_VELOCITY;
            }
            console.log(`Beat: ${nextBeat}/${beatsPerMeasure}, Vel: ${velocity}`);
             // Send Note On (inside functional update to ensure correct beat/velocity)
            try {
                 sendMessage(NOTE_ON_CMD, [selectedSoundNote, velocity]);
            } catch (error) {
                 console.error('Error sending Note On:', error);
                 stopMetronome(); // Consider stopping if send fails
            }
            return nextBeat; // Return the new beat value for the state
      });

      // Schedule Note Off using raw send with correct signature
      // Clear previous Note Off timeout in case interval fires faster than duration
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
          console.log(`Sending Note Off: ${selectedSoundNote} via raw`);
          sendMessage(NOTE_OFF_CMD, [selectedSoundNote, 0]);
          timeoutRef.current = null;
          stopMetronome(); // Stop if sending fails
      }, NOTE_DURATION_MS);
    }, intervalMs);

  }, [isPlaying, bpm, selectedSoundNote, sendMessage, stopMetronome, timeSignature]); // Added isPlaying back, kept functional beat update

  // Cleanup on unmount or when dependencies change that require stopping
  useEffect(() => {
    // Cleanup function returned by useEffect
    return () => {
      stopMetronome();
    };
  }, [stopMetronome]); // Depend only on stopMetronome


  // --- Public API ---
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  }, [isPlaying]); // Removed startMetronome dependency

  const changeTempo = useCallback((newBpm) => {
    const numericBpm = parseInt(newBpm, 10);
    if (!isNaN(numericBpm) && numericBpm > 0) {
       console.log(`Setting BPM to ${numericBpm}`);
      setBpm(numericBpm);
      // If playing, restart the interval with the new tempo
      if (isPlaying) {
        startMetronome();
      }
    }
  }, [isPlaying, startMetronome]); // Add startMetronome back

  const changeSound = useCallback((soundNote) => {
     const numericNote = parseInt(soundNote, 10);
      if (!isNaN(numericNote) && Object.values(METRONOME_SOUNDS).includes(numericNote)) {
        console.log(`Setting Sound Note to ${numericNote}`);
        setSelectedSoundNote(numericNote);
         // If playing, the next tick will use the new sound
      } else {
         console.warn(`Invalid sound note selected: ${soundNote}`);
      }
  }, []);

  // Function to change time signature
   const changeTimeSignature = useCallback((newTimeSignature) => {
      if (['none', '3/4', '4/4'].includes(newTimeSignature)) {
          console.log(`Setting Time Signature to ${newTimeSignature}`);
          setTimeSignature(newTimeSignature);
          setCurrentBeat(0); // Reset beat count on change
          // If playing, restart the interval with the new signature
          if (isPlaying) {
              startMetronome();
          }
      } else {
          console.warn(`Invalid time signature selected: ${newTimeSignature}`);
      }
   }, [isPlaying, startMetronome]); // Keep startMetronome here


  return {
    isPlaying,
    bpm,
    selectedSoundNote,
    timeSignature, // Expose time signature state
    availableSounds: METRONOME_SOUNDS, // Expose available sounds
    togglePlay,
    changeTempo,
    changeSound,
    changeTimeSignature, // Expose function to change time signature
  };
}

export default useMetronome; 