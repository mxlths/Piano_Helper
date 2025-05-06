import React, { useState, useEffect, useCallback } from 'react';
// Import the sound data and helper functions
import { getAvailableBanks, getProgramsForBank, gm2MelodicSounds, gm2DrumKits } from '../gm2SoundsData';

function Gm2SoundSelector(props) {
  // Props will include: selectedOutputId, sendMessage, log
  const { selectedOutputId, sendMessage, log } = props;

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

  // Wrap handleSend in useCallback to ensure it uses the latest props/state
  const handleSend = useCallback(() => {
    // Determine which sound map to use based on the channel
    const isDrumChannel = selectedChannel === 10;
    const soundMap = isDrumChannel ? gm2DrumKits : gm2MelodicSounds;

    // Get the selected program details from the appropriate map
    let selectedSoundDetails = null;
    // Find the bank data using the LSB (Note: Drum kits often use LSB 0)
    const bankData = soundMap[selectedBankLsb];
    
    if (bankData && bankData.programs) {
        // Find the program using the PC value (which is 0-indexed in our data)
        selectedSoundDetails = bankData.programs.find(p => p.pc === selectedProgram);
    }

    if (!selectedSoundDetails) {
      // Safeguard: Check if log is a function before calling
      if (typeof log === 'function') {
        log(`Could not find sound details for Channel: ${selectedChannel}, Bank LSB: ${selectedBankLsb}, Program PC: ${selectedProgram}. Cannot send.`, 'WARN');
      } else {
        console.warn('[Gm2SoundSelector] Log function not available when checking sound details.'); // Fallback log
      }
      return;
    }

    // Extract values from the found sound details
    // bankMSB is generally 0 for GM2 standard sounds/drums
    const bankMSB = isDrumChannel ? (selectedSoundDetails.msb ?? 0) : (selectedSoundDetails.msb ?? 0); // Default MSB to 0 if not specified
    const bankLSB = selectedBankLsb; // We already have the LSB from state
    const programChange = selectedProgram; // We already have the PC (0-indexed) from state
    
    const midiChannel = selectedChannel - 1; // Convert 1-based channel to 0-based

    // MIDI Status Bytes (B0 for CC, C0 for Program Change)
    const STATUS_CC = 0xB0;
    const STATUS_PC = 0xC0;

    // MIDI Control Change Numbers for Bank Select
    const BANK_SELECT_MSB_CC = 0;
    const BANK_SELECT_LSB_CC = 32;

    // Ensure bankMSB, bankLSB, and programChange are valid numbers
    // Also check midiChannel just in case
    if (isNaN(bankMSB) || isNaN(bankLSB) || isNaN(programChange) || isNaN(midiChannel) || midiChannel < 0 || midiChannel > 15) {
      // Safeguard: Check if log is a function before calling
      if (typeof log === 'function') {
        log(`Invalid sound selection parameters: MSB=${bankMSB}, LSB=${bankLSB}, PC=${programChange}, Channel=${selectedChannel}`, 'ERROR');
      } else {
         console.error('[Gm2SoundSelector] Log function not available for invalid parameters error.'); // Fallback log
      }
      return;
    }

    // Send MIDI messages using separate status and data arguments (for webmidi.js v2.x)
    // Remove Safeguards and use 'sendMessage'
    if (typeof log === 'function') log(`Sending Bank Select MSB: Status=0x${(STATUS_CC + midiChannel).toString(16)}, Data=[${BANK_SELECT_MSB_CC}, ${bankMSB}]`, 'DEBUG');
    sendMessage(STATUS_CC + midiChannel, [BANK_SELECT_MSB_CC, bankMSB]);
    
    if (typeof log === 'function') log(`Sending Bank Select LSB: Status=0x${(STATUS_CC + midiChannel).toString(16)}, Data=[${BANK_SELECT_LSB_CC}, ${bankLSB}]`, 'DEBUG');
    sendMessage(STATUS_CC + midiChannel, [BANK_SELECT_LSB_CC, bankLSB]);

    if (typeof log === 'function') log(`Sending Program Change: Status=0x${(STATUS_PC + midiChannel).toString(16)}, Data=[${programChange}]`, 'DEBUG');
    sendMessage(STATUS_PC + midiChannel, [programChange]);

    if (typeof log === 'function') log(`GM2 sound selected: Bank MSB=${bankMSB}, LSB=${bankLSB}, PC=${programChange} on channel ${selectedChannel}`);
  }, [selectedChannel, selectedBankLsb, selectedProgram, selectedOutputId, log, sendMessage, gm2DrumKits, gm2MelodicSounds]); // Add dependencies

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