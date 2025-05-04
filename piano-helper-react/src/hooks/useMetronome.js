import { useState, useEffect, useRef, useCallback, useContext } from 'react';
// We might need MidiContext if sendMessage isn't passed down directly
// import { MidiContext } from '../contexts/MidiContext'; // Adjust path if needed

// Define metronome sounds (MIDI note numbers for channel 10)
const METRONOME_SOUNDS = {
  SideStick: 37,
  HighWoodBlock: 76,
  LowWoodBlock: 77,
  HighAgogo: 67,
  // Add more if desired
};

const DEFAULT_BPM = 120;
const DEFAULT_SOUND_NOTE = METRONOME_SOUNDS.HighWoodBlock;
const MIDI_CHANNEL = 9; // MIDI channels are 0-15, so channel 10 is 9
const NOTE_ON_CMD = 0x90 | MIDI_CHANNEL;
const NOTE_OFF_CMD = 0x80 | MIDI_CHANNEL;
const DEFAULT_VELOCITY = 100;
const NOTE_DURATION_MS = 50; // How long the note 'on' message lasts virtually

function useMetronome(sendMessage) { // Accept sendMessage as a prop/argument
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [selectedSoundNote, setSelectedSoundNote] = useState(DEFAULT_SOUND_NOTE);

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
    if (isPlaying || !sendMessage) return;

    console.log(`Starting metronome: BPM=${bpm}, Sound=${selectedSoundNote}`);
    setIsPlaying(true);
    stopMetronome(); // Clear any existing interval/timeouts first

    const intervalMs = (60 / bpm) * 1000;

    intervalRef.current = setInterval(() => {
      // Send Note On
      try {
          console.log(`Sending Note On: ${selectedSoundNote}`);
          sendMessage([NOTE_ON_CMD, selectedSoundNote, DEFAULT_VELOCITY]);

          // Schedule Note Off
          timeoutRef.current = setTimeout(() => {
              console.log(`Sending Note Off: ${selectedSoundNote}`);
              sendMessage([NOTE_OFF_CMD, selectedSoundNote, 0]); // Velocity 0 for Note Off
              timeoutRef.current = null;
          }, NOTE_DURATION_MS);

      } catch (error) {
          console.error('Error sending metronome MIDI message:', error);
          stopMetronome(); // Stop if sending fails
      }
    }, intervalMs);

  }, [isPlaying, bpm, selectedSoundNote, sendMessage, stopMetronome]);

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
  }, [isPlaying, startMetronome, stopMetronome]);

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
  }, [isPlaying, startMetronome]);

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


  return {
    isPlaying,
    bpm,
    selectedSoundNote,
    availableSounds: METRONOME_SOUNDS, // Expose available sounds
    togglePlay,
    changeTempo,
    changeSound,
  };
}

export default useMetronome; 