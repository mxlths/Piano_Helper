import { DRUM_CHANNEL, GM2_DRUM_KITS, DEFAULT_DRUM_KIT_NAME } from './midiConstants';

/**
 * Selects a GM2 drum kit on the specified MIDI output channel.
 * Assumes sendMessage function expects (statusByte, dataBytesArray).
 * @param {string} kitName - The name of the kit (e.g., 'Standard Kit').
 * @param {function} sendMessage - The sendMessage function from the useMidi hook.
 * @param {function} log - The log function from the useMidi hook (optional).
 */
export const selectDrumKit = (kitName, sendMessage, log = console.log) => {
  let kit = GM2_DRUM_KITS[kitName];

  if (!kit) {
    log(`Drum kit "${kitName}" not found. Using default: ${DEFAULT_DRUM_KIT_NAME}.`, 'WARN');
    kit = GM2_DRUM_KITS[DEFAULT_DRUM_KIT_NAME];
    if (!kit) { // Should not happen if default is in the map
        log(`Default drum kit ${DEFAULT_DRUM_KIT_NAME} also not found. Cannot select kit.`, 'ERROR');
        return;
    }
  }

  if (typeof sendMessage !== 'function') {
      log('sendMessage function is required to select drum kit.', 'ERROR');
      return;
  }

  log(`Selecting drum kit: ${kitName} (MSB:${kit.msb}, LSB:${kit.lsb}, PC:${kit.pc}) on channel ${DRUM_CHANNEL + 1}...`);

  const STATUS_CC = 0xB0 | DRUM_CHANNEL; // Control Change status byte for drum channel
  const STATUS_PC = 0xC0 | DRUM_CHANNEL; // Program Change status byte for drum channel
  const BANK_SELECT_MSB_CC = 0;
  const BANK_SELECT_LSB_CC = 32;

  try {
    // 1. Send Bank Select MSB
    sendMessage(STATUS_CC, [BANK_SELECT_MSB_CC, kit.msb]);

    // 2. Send Bank Select LSB
    sendMessage(STATUS_CC, [BANK_SELECT_LSB_CC, kit.lsb]);

    // 3. Send Program Change (PC is 1-indexed in map, subtract 1 for 0-based MIDI message data)
    sendMessage(STATUS_PC, [kit.pc - 1]);

    log(`Drum kit ${kitName} selection messages sent.`);

  } catch (error) {
      log(`Error sending drum kit selection messages: ${error.message}`, 'ERROR');
  }
};

// Add other playback-related utility functions here later (e.g., loading, parsing) 