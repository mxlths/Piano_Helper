import { useState, useEffect, useCallback, useRef } from 'react';
import MidiPlayer from 'midi-player-js'; // Assuming it's importable like this

// Define constants or default values if needed
const DEFAULT_PLAYER_OPTIONS = {};

/**
 * Custom Hook to manage MIDI file playback using midi-player-js.
 * @param {function} sendMessage - The sendMessage function from the useMidi hook.
 */
function useMidiPlayer(sendMessage) {
  const [player, setPlayer] = useState(null);
  const [playbackState, setPlaybackState] = useState('stopped'); // 'stopped', 'playing', 'paused'
  const [loadedFileName, setLoadedFileName] = useState(null);
  // Add more state as needed (e.g., currentTick, totalTicks, tempo)

  // Ref to ensure sendMessage is the latest version if it changes
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // Initialize the Player instance
  useEffect(() => {
    const eventHandler = (event) => {
      console.log('MIDI Player Event:', event); // Log the raw event first
      const currentSendMessage = sendMessageRef.current;
      if (!currentSendMessage) {
        // console.warn('MIDI Player: sendMessage not available.');
        return;
      }

      let status;
      let data = [];
      const channel = event.channel ? event.channel - 1 : 0; // MIDI Player uses 1-16, raw MIDI uses 0-15

      // Map event names to MIDI status bytes and data
      // (Need to verify event object structure from midi-player-js logs)
      switch (event.name) {
        case 'Note on':
          status = 0x90 | channel;
          data = [event.noteNumber, event.velocity];
          // Handle velocity 0 as Note Off (common practice)
          if (event.velocity === 0) {
            status = 0x80 | channel;
            data = [event.noteNumber, 0]; // Velocity 0 for Note Off
          }
          break;
        case 'Note off':
          status = 0x80 | channel;
          data = [event.noteNumber, event.velocity !== undefined ? event.velocity : 0]; // Use velocity if provided, else 0
          break;
        case 'Controller Change': // Verify exact name
        case 'Control Change': // Common alternative name
          status = 0xB0 | channel;
          data = [event.number, event.value];
          break;
        case 'Program Change': // Verify exact name
          status = 0xC0 | channel;
          data = [event.value]; // Program change only has one data byte
          break;
        case 'Pitch Bend': // Verify exact name
        case 'Pitch Wheel': // Common alternative name
          status = 0xE0 | channel;
          // Pitch bend combines two 7-bit values (LSB, MSB)
          // midi-player-js likely provides a combined value (0-16383)
          // Need to confirm event.value range/structure
          const lsb = event.value & 0x7F;
          const msb = (event.value >> 7) & 0x7F;
          data = [lsb, msb];
          break;
        case 'Set Tempo': // Verify exact name
          // Tempo is a meta event, not sent directly via raw MIDI ports
          // We could potentially update internal tempo state if needed
          console.log('Tempo Change Event:', event.data); // Log tempo value (microseconds per quarter note)
          return; // Don't send meta events via sendMessage
        // Add cases for other events if needed (SysEx, other Meta)
        default:
          // Ignore unknown or unhandled events (especially meta like lyrics, markers)
          // console.log('Unhandled MIDI Player event:', event.name);
          return;
      }

      // Send the mapped MIDI message
      if (status !== undefined) {
        currentSendMessage(status, data);
      }
    };

    console.log('Initializing MidiPlayer.Player...');
    const newPlayer = new MidiPlayer.Player(eventHandler);

    // --- Set up Player Event Listeners ---
    newPlayer.on('fileLoaded', () => {
      console.log('MIDI Player: File loaded.');
      // Potentially update state with file info here (total ticks, etc.)
    });

    newPlayer.on('playing', (currentTickInfo) => {
      // Fires rapidly during playback
      // console.log('MIDI Player: Playing tick:', currentTickInfo.tick);
      if (playbackState !== 'playing') {
         setPlaybackState('playing');
      }
      // Update current progress state here if needed
    });

    newPlayer.on('paused', () => {
        console.log('MIDI Player: Paused.');
        setPlaybackState('paused');
    });

    newPlayer.on('stopped', () => { // Might need 'endOfFile' instead or as well
        console.log('MIDI Player: Stopped.');
        setPlaybackState('stopped');
        setLoadedFileName(null); // Or keep it loaded? Decide behavior.
    });

    newPlayer.on('endOfFile', () => {
      console.log('MIDI Player: End of file reached.');
      setPlaybackState('stopped'); // Treat end as stopped
      // Reset player? Stop completely?
    });

    setPlayer(newPlayer);

    // Cleanup function
    return () => {
      console.log('Cleaning up MidiPlayer instance...');
      if (newPlayer) {
        newPlayer.stop(); // Ensure playback stops on unmount
        // Remove listeners? Check library docs if necessary
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize only once on mount

  // --- Control Functions ---

  const loadMidiFile = useCallback(async (url) => {
    if (!player) {
      console.error('Player not initialized.');
      return;
    }
    console.log(`Attempting to load MIDI file from URL: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log(`Fetched ${arrayBuffer.byteLength} bytes.`);
      player.loadArrayBuffer(arrayBuffer);
      const fileName = url.substring(url.lastIndexOf('/') + 1);
      setLoadedFileName(fileName); // Store the name of the loaded file
      setPlaybackState('stopped'); // Reset state to stopped after loading
      console.log(`Successfully loaded ${fileName} into player.`);
    } catch (error) {
      console.error('Error loading MIDI file:', error);
      setLoadedFileName(null);
      setPlaybackState('stopped');
    }
  }, [player]);

  const play = useCallback(() => {
    if (player && player.isPlaying()) {
        console.warn('Player already playing.');
        return;
    }
    if (player && loadedFileName) { // Only play if a file is loaded
      console.log('Calling player.play()...');
      player.play();
      // Note: 'playing' state is set via the 'playing' event listener
    } else {
        console.warn('Cannot play: Player not ready or no file loaded.');
    }
  }, [player, loadedFileName]);

  const pause = useCallback(() => {
     if (player && player.isPlaying()) {
       console.log('Calling player.pause()...');
       player.pause();
       // Note: 'paused' state is set via the 'paused' event listener
     }
  }, [player]);

  const stop = useCallback(() => {
    if (player) { // Stop regardless of current state
      console.log('Calling player.stop()...');
      player.stop();
      // Note: 'stopped' state is set via the 'stopped'/'endOfFile' event listener
    }
  }, [player]);

  // Add other control functions like setTempo, skipToTick etc. if needed

  // --- Return Hook API ---
  return {
    // State
    playbackState,
    loadedFileName,
    // Add more state like currentTick, duration if needed

    // Functions
    loadMidiFile,
    play,
    pause,
    stop,
  };
}

export default useMidiPlayer; 