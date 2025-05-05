import React, { useState, useEffect } from 'react';
// Import the sound data and helper functions
import { getAvailableBanks, getProgramsForBank } from '../gm2SoundsData';

function Gm2SoundSelector(props) {
  // Props will include: selectedOutputId, sendMidiMessage
  const { selectedOutputId, sendMidiMessage } = props;

  const [selectedChannel, setSelectedChannel] = useState(1);
  const [availableBanks, setAvailableBanks] = useState([]);
  const [selectedBankLsb, setSelectedBankLsb] = useState(0); 
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(0); 
  
  // Update available banks when channel changes
  useEffect(() => {
    const banks = getAvailableBanks(selectedChannel);
    setAvailableBanks(banks);
    // Reset selected bank and program if the banks list is not empty
    if (banks.length > 0) {
      setSelectedBankLsb(banks[0].lsb); // Default to the first bank
      const programs = getProgramsForBank(selectedChannel, banks[0].lsb);
      setAvailablePrograms(programs);
      if (programs.length > 0) {
        setSelectedProgram(programs[0].pc); // Default to first program in the bank
      } else {
        setSelectedProgram(0); // Or handle empty program list
      }
    } else {
        // Handle case where there are no banks for the channel (shouldn't happen with GM2)
        setSelectedBankLsb(0);
        setAvailablePrograms([]);
        setSelectedProgram(0);
    }
  }, [selectedChannel]);

  // Update available programs when selected bank changes
  useEffect(() => {
    const programs = getProgramsForBank(selectedChannel, selectedBankLsb);
    setAvailablePrograms(programs);
    // Reset selected program if the programs list is not empty
    if (programs.length > 0) {
      setSelectedProgram(programs[0].pc); // Default to first program
    } else {
      setSelectedProgram(0); // Or handle empty program list
    }
  }, [selectedBankLsb, selectedChannel]); // Also depend on channel

  const handleSend = () => {
    if (!selectedOutputId || !sendMidiMessage) {
      console.warn("GM2 Send: No MIDI Output selected or send function missing.");
      return;
    }
    
    console.log(`Sending GM2 Sound Select - Channel: ${selectedChannel}, Bank LSB: ${selectedBankLsb}, Program: ${selectedProgram}`);

    const midiChannel = selectedChannel - 1; // MIDI channels are 0-15

    // 1. Send Bank Select MSB (CC 0) - Value 121 for GM2 Melodic, 120 for GM2 Drums
    const bankMsbValue = selectedChannel === 10 ? 120 : 121;
    sendMidiMessage([0xB0 + midiChannel, 0, bankMsbValue]); 

    // 2. Send Bank Select LSB (CC 32)
    sendMidiMessage([0xB0 + midiChannel, 32, selectedBankLsb]);

    // 3. Send Program Change
    sendMidiMessage([0xC0 + midiChannel, selectedProgram]);
  };

  const handleBankChange = (e) => {
    setSelectedBankLsb(parseInt(e.target.value, 10));
    // Program list will update via useEffect
  };

  const handleProgramChange = (e) => {
    setSelectedProgram(parseInt(e.target.value, 10));
  };

   const handleChannelChange = (e) => {
    setSelectedChannel(parseInt(e.target.value, 10));
    // Banks and programs will update via useEffect
  };

  return (
    <div style={{ border: '1px dashed green', padding: '10px', marginTop: '10px' }}>
      {/* Channel Selector */} 
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="gm2-channel" style={{ marginRight: '5px' }}>MIDI Channel:</label>
        <select 
          id="gm2-channel" 
          value={selectedChannel} 
          onChange={handleChannelChange}
        >
          {[...Array(16).keys()].map(i => (
            <option key={i + 1} value={i + 1}>
              {i + 1}{i + 1 === 10 ? ' (Drums)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Bank Selector */} 
      <div style={{ marginBottom: '10px' }}>
         <label htmlFor="gm2-bank" style={{ marginRight: '5px' }}>{selectedChannel === 10 ? 'Drum Bank:' : 'Sound Bank:'}</label>
        <select 
          id="gm2-bank" 
          value={selectedBankLsb} 
          onChange={handleBankChange}
          disabled={availableBanks.length === 0}
        >
          {availableBanks.map(bank => (
            <option key={bank.lsb} value={bank.lsb}>
              {bank.name} (LSB: {bank.lsb})
            </option>
          ))}
        </select>
      </div>

      {/* Program/Kit Selector */} 
      <div style={{ marginBottom: '10px' }}>
         <label htmlFor="gm2-program" style={{ marginRight: '5px' }}>{selectedChannel === 10 ? 'Drum Kit:' : 'Sound:'}</label>
        <select 
          id="gm2-program" 
          value={selectedProgram} 
          onChange={handleProgramChange}
          disabled={availablePrograms.length === 0}
        >
          {availablePrograms.map(program => (
            <option key={program.pc} value={program.pc}>
              {program.name} (PC: {program.pc + 1}) {/* Display 1-based PC */}
            </option>
          ))}
        </select>
      </div>

      {/* Send Button */} 
      <button onClick={handleSend} disabled={!selectedOutputId}>
        Set Sound on Channel {selectedChannel}
      </button>
      {!selectedOutputId && 
          <p style={{fontSize: '0.8em', marginTop: '5px', color: 'grey'}}>
              (Select MIDI Output in Setup tab to enable)
          </p>}
    </div>
  );
}

export default Gm2SoundSelector; 