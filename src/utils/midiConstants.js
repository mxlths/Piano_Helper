// MIDI Channel for Drums (Channel 10 is index 9)
export const DRUM_CHANNEL = 9;

// Default kit name to use if selection fails or isn't found
export const DEFAULT_DRUM_KIT_NAME = 'Standard Kit';

// Drum Kit definitions (MSB=120, LSB=0 for all listed)
// Program Change (PC) is 1-indexed as per GM2 documentation/common usage
export const GM2_DRUM_KITS = {
  'Standard Kit': { msb: 120, lsb: 0, pc: 1 },
  'Room Kit':     { msb: 120, lsb: 0, pc: 9 },
  'Power Kit':    { msb: 120, lsb: 0, pc: 17 },
  'Electronic Kit':{ msb: 120, lsb: 0, pc: 25 },
  'TR-808 Kit':   { msb: 120, lsb: 0, pc: 26 },
  'Jazz Kit':     { msb: 120, lsb: 0, pc: 33 },
  'Brush Kit':    { msb: 120, lsb: 0, pc: 41 },
  'Orchestra Kit':{ msb: 120, lsb: 0, pc: 49 },
  'Sound FX Kit': { msb: 120, lsb: 0, pc: 57 },
  // Add more kits from Roland FP-30X manual if needed, ensuring correct MSB/LSB/PC
}; 