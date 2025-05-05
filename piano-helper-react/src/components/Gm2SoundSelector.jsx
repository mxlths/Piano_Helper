import React, { useState } from 'react';

function Gm2SoundSelector(props) {
  // Props will be added later, e.g.:
  // const { selectedOutput, sendMidiMessage } = props;

  const [selectedChannel, setSelectedChannel] = useState(1);
  const [selectedBankLsb, setSelectedBankLsb] = useState(0); // Example state
  const [selectedProgram, setSelectedProgram] = useState(0); // Example state

  const handleSend = () => {
    console.log(`TODO: Send GM2 Sound Select - Channel: ${selectedChannel}, Bank LSB: ${selectedBankLsb}, Program: ${selectedProgram}`);
    // TODO: Implement actual MIDI sending logic using props.sendMidiMessage
    // Example sequence:
    // 1. Send Bank Select MSB (CC 0, Value 121 for GM2)
    // 2. Send Bank Select LSB (CC 32, Value selectedBankLsb)
    // 3. Send Program Change (Value selectedProgram)
  };

  return (
    <div style={{ border: '1px dashed green', padding: '10px', marginTop: '10px' }}>
      <h5>GM2 Sound Selector Component</h5>
      
      {/* Channel Selector */}
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="gm2-channel">MIDI Channel: </label>
        <select 
          id="gm2-channel" 
          value={selectedChannel} 
          onChange={(e) => setSelectedChannel(parseInt(e.target.value, 10))}
        >
          {[...Array(16).keys()].map(i => (
            <option key={i + 1} value={i + 1}>{i + 1}{i + 1 === 10 ? ' (Drums)' : ''}</option>
          ))}
        </select>
      </div>

      {/* TODO: Add Bank Selection Dropdown/List */} 
      {/* TODO: Add Program/Sound Selection Dropdown/List (conditional based on channel 10) */}

      {/* Send Button */}
      <button onClick={handleSend}>Set Sound</button>
      
      <p style={{fontSize: '0.8em', marginTop: '10px', color: 'grey'}}>
        (Actual sound/bank selection UI and MIDI sending logic to be implemented)
      </p>
    </div>
  );
}

export default Gm2SoundSelector; 