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
      const currentSendMessage = sendMessageRef.current;
      if (!currentSendMessage) return;
      let status; let data = [];
      const channel = event.channel ? event.channel - 1 : 0;
      switch (event.name) {
        case 'Note on':
          status = 0x90 | channel; data = [event.noteNumber, event.velocity];
          if (event.velocity === 0) { status = 0x80 | channel; data = [event.noteNumber, 0]; }
          break;
        case 'Note off':
          status = 0x80 | channel; data = [event.noteNumber, event.velocity !== undefined ? event.velocity : 0];
          break;
        case 'Controller Change': case 'Control Change':
          status = 0xB0 | channel; data = [event.number, event.value];
          break;
        case 'Program Change':
          status = 0xC0 | channel; data = [event.value];
          break;
        case 'Pitch Bend': case 'Pitch Wheel':
          status = 0xE0 | channel; const lsb = event.value & 0x7F; const msb = (event.value >> 7) & 0x7F; data = [lsb, msb];
          break;
        case 'Set Tempo': return;
        default: return;
      }
      if (status !== undefined) { currentSendMessage(status, data); }
    };

    const newPlayer = new MidiPlayer.Player(eventHandler);

    newPlayer.on('fileLoaded', () => {
      console.log('MIDI Player: File loaded.');
    });
    newPlayer.on('playing', (currentTickInfo) => { /* console.log(`Tick: ${currentTickInfo.tick}`); */ });
    newPlayer.on('paused', () => { /* State set in pause() */ });
    newPlayer.on('stopped', () => { /* State set in stop() */ });

    newPlayer.on('endOfFile', () => {
      console.log(`[useMidiPlayer] 'endOfFile' event fired. Current state: ${playbackState}`); // Need to read latest state
      console.log('MIDI Player: End of file reached, looping...');
      try {
          if (newPlayer && typeof newPlayer.skipToTick === 'function' && typeof newPlayer.play === 'function') {
             console.log('[useMidiPlayer] Scheduling loop restart...');
             setTimeout(() => {
                  try {
                      // Re-check player state *inside* timeout
                      if (newPlayer.isPlaying()) {
                          console.warn('[useMidiPlayer] Inside setTimeout: Player already playing? Aborting loop start.');
                          return;
                      }
                      console.log('[useMidiPlayer] Inside setTimeout: Calling skipToTick(0) and play()...');
                      newPlayer.skipToTick(0);
                      newPlayer.play();
                      console.log(`[useMidiPlayer] Inside setTimeout: After play() call, player.isPlaying(): ${newPlayer.isPlaying()}`);
                      console.log('[useMidiPlayer] Inside setTimeout: Explicitly setting state back to playing for loop.');
                      setPlaybackState('playing'); // Ensure state is playing
                  } catch(loopError) {
                      console.error('[useMidiPlayer] Error inside loop setTimeout:', loopError);
                      setPlaybackState('stopped');
                  }
             }, 10); // Small delay (10ms)
          } else {
             console.error('MIDI Player: Cannot loop, player instance or methods invalid.');
             console.log(`[useMidiPlayer] Setting playbackState -> 'stopped' (loop error)`);
             setPlaybackState('stopped');
          }
      } catch (error) {
          console.error('MIDI Player: Error during top-level loop attempt:', error);
          console.log(`[useMidiPlayer] Setting playbackState -> 'stopped' (loop exception)`);
          setPlaybackState('stopped');
      }
    });

    setPlayer(newPlayer);

    return () => {
      if (newPlayer) { newPlayer.stop(); }
    };
  }, []); // Initialize player and listeners only once

  // --- Control Functions ---
  const loadMidiFile = useCallback(async (url) => {
    if (!player) return;
    console.log(`Attempting to load MIDI file from URL: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      player.loadArrayBuffer(arrayBuffer);
      const fileName = url.substring(url.lastIndexOf('/') + 1);
      setLoadedFileName(fileName);
      setPlaybackState('stopped');
      console.log(`Successfully loaded ${fileName} into player.`);
    } catch (error) {
      console.error('Error loading MIDI file:', error);
      setLoadedFileName(null);
      setPlaybackState('stopped');
    }
  }, [player]);

  const play = useCallback(() => {
    if (!player || !loadedFileName) { console.warn('Cannot play: No player or file loaded.'); return; }
    if (player.isPlaying()) { console.warn('Player already playing.'); return; }
    console.log('Calling player.play()...');
    player.play();
    console.log(`[useMidiPlayer] Setting playbackState -> 'playing' (after play call)`);
    setPlaybackState('playing');
  }, [player, loadedFileName]);

  const pause = useCallback(() => {
     if (player && player.isPlaying()) {
       console.log('Calling player.pause()...');
       player.pause();
       console.log(`[useMidiPlayer] Setting playbackState -> 'paused' (after pause call)`);
       setPlaybackState('paused');
     }
  }, [player]);

  const stop = useCallback(() => {
    if (player) {
      console.log('Calling player.stop()...');
      player.stop();
      console.log(`[useMidiPlayer] Setting playbackState -> 'stopped' (after stop call)`);
      setPlaybackState('stopped');
    }
  }, [player]);

  // --- Return Hook API ---
  return {
    playbackState,
    loadedFileName,
    loadMidiFile,
    play,
    pause,
    stop,
  };
}

export default useMidiPlayer;