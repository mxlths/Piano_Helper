function Controls(props) {
  const {
    // ... other existing props ...
    selectedOutputId,
    sendMessage,
    log,
    isMetronomePlaying,
    startMetronome,
    stopMetronome,
    bpm,
    onBpmChange,
    timeSignature,
    onTimeSignatureChange,
    selectedSoundNote,
    onSoundNoteChange,
    metronomeSounds,
    selectedDrumKitName,
    onDrumKitChange
    // Add any other props Controls receives from App.jsx here
  } = props;

  // ... existing code ...
  {activeTab === 'gm2' && (
    <Gm2SoundSelector
      selectedOutputId={selectedOutputId}
      sendMidiMessage={sendMessage}
      log={log}
    />
  )}
  // ... existing code ...
} 