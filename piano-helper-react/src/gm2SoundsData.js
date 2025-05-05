// Data extracted from FP-30X MIDI Implementation PDF (Pages 10-15)
// Note: Program Change (PC) values are 0-indexed here (0-127) as used in MIDI, 
// while the PDF lists them as 1-128. Bank Select LSB is 0-indexed (0-127).

export const gm2MelodicSounds = {
  // Bank LSB: 0 (Piano)
  0: { 
    name: "Piano", 
    programs: [
      { pc: 0, name: "Acoustic Grand Piano" },
      { pc: 1, name: "Bright Acoustic Piano" },
      { pc: 2, name: "Electric Grand Piano" },
      { pc: 3, name: "Honky-tonk Piano" },
      { pc: 4, name: "Electric Piano 1" },
      { pc: 5, name: "Electric Piano 2" },
      { pc: 6, name: "Harpsichord" },
      { pc: 7, name: "Clavi" },
    ]
  },
  // Bank LSB: 8 (Chromatic Percussion)
  8: {
    name: "Chromatic Percussion",
    programs: [
      { pc: 8, name: "Celesta" },
      { pc: 9, name: "Glockenspiel" },
      { pc: 10, name: "Music Box" },
      { pc: 11, name: "Vibraphone" },
      { pc: 12, name: "Marimba" },
      { pc: 13, name: "Xylophone" },
      { pc: 14, name: "Tubular Bells" },
      { pc: 15, name: "Dulcimer" },
    ]
  },
   // Bank LSB: 16 (Organ)
  16: {
    name: "Organ",
    programs: [
        { pc: 16, name: "Drawbar Organ" },
        { pc: 17, name: "Percussive Organ" },
        { pc: 18, name: "Rock Organ" },
        { pc: 19, name: "Church Organ" },
        { pc: 20, name: "Reed Organ" },
        { pc: 21, name: "Accordion" },
        { pc: 22, name: "Harmonica" },
        { pc: 23, name: "Tango Accordion" },
    ]
  },
  // Bank LSB: 24 (Guitar)
  24: {
    name: "Guitar",
    programs: [
        { pc: 24, name: "Acoustic Guitar (nylon)" },
        { pc: 25, name: "Acoustic Guitar (steel)" },
        { pc: 26, name: "Electric Guitar (jazz)" },
        { pc: 27, name: "Electric Guitar (clean)" },
        { pc: 28, name: "Electric Guitar (muted)" },
        { pc: 29, name: "Overdriven Guitar" },
        { pc: 30, name: "Distortion Guitar" },
        { pc: 31, name: "Guitar harmonics" },
    ]
  },
   // Bank LSB: 32 (Bass)
  32: {
    name: "Bass",
    programs: [
        { pc: 32, name: "Acoustic Bass" },
        { pc: 33, name: "Electric Bass (finger)" },
        { pc: 34, name: "Electric Bass (pick)" },
        { pc: 35, name: "Fretless Bass" },
        { pc: 36, name: "Slap Bass 1" },
        { pc: 37, name: "Slap Bass 2" },
        { pc: 38, name: "Synth Bass 1" },
        { pc: 39, name: "Synth Bass 2" },
    ]
  },
   // Bank LSB: 40 (Strings)
  40: {
    name: "Strings",
    programs: [
        { pc: 40, name: "Violin" },
        { pc: 41, name: "Viola" },
        { pc: 42, name: "Cello" },
        { pc: 43, name: "Contrabass" },
        { pc: 44, name: "Tremolo Strings" },
        { pc: 45, name: "Pizzicato Strings" },
        { pc: 46, name: "Orchestral Harp" },
        { pc: 47, name: "Timpani" },
    ]
  },
   // Bank LSB: 48 (Ensemble)
  48: {
    name: "Ensemble",
    programs: [
        { pc: 48, name: "String Ensemble 1" },
        { pc: 49, name: "String Ensemble 2" },
        { pc: 50, name: "SynthStrings 1" },
        { pc: 51, name: "SynthStrings 2" },
        { pc: 52, name: "Choir Aahs" },
        { pc: 53, name: "Voice Oohs" },
        { pc: 54, name: "Synth Voice" },
        { pc: 55, name: "Orchestra Hit" },
    ]
  },
   // Bank LSB: 56 (Brass)
  56: {
    name: "Brass",
    programs: [
        { pc: 56, name: "Trumpet" },
        { pc: 57, name: "Trombone" },
        { pc: 58, name: "Tuba" },
        { pc: 59, name: "Muted Trumpet" },
        { pc: 60, name: "French Horn" },
        { pc: 61, name: "Brass Section" },
        { pc: 62, name: "SynthBrass 1" },
        { pc: 63, name: "SynthBrass 2" },
    ]
  },
   // Bank LSB: 64 (Reed)
  64: {
    name: "Reed",
    programs: [
        { pc: 64, name: "Soprano Sax" },
        { pc: 65, name: "Alto Sax" },
        { pc: 66, name: "Tenor Sax" },
        { pc: 67, name: "Baritone Sax" },
        { pc: 68, name: "Oboe" },
        { pc: 69, name: "English Horn" },
        { pc: 70, name: "Bassoon" },
        { pc: 71, name: "Clarinet" },
    ]
  },
   // Bank LSB: 72 (Pipe)
  72: {
    name: "Pipe",
    programs: [
        { pc: 72, name: "Piccolo" },
        { pc: 73, name: "Flute" },
        { pc: 74, name: "Recorder" },
        { pc: 75, name: "Pan Flute" },
        { pc: 76, name: "Blown Bottle" },
        { pc: 77, name: "Shakuhachi" },
        { pc: 78, name: "Whistle" },
        { pc: 79, name: "Ocarina" },
    ]
  },
  // Bank LSB: 80 (Synth Lead)
  80: {
    name: "Synth Lead",
    programs: [
        { pc: 80, name: "Lead 1 (square)" },
        { pc: 81, name: "Lead 2 (sawtooth)" },
        { pc: 82, name: "Lead 3 (calliope)" },
        { pc: 83, name: "Lead 4 (chiff)" },
        { pc: 84, name: "Lead 5 (charang)" },
        { pc: 85, name: "Lead 6 (voice)" },
        { pc: 86, name: "Lead 7 (fifths)" },
        { pc: 87, name: "Lead 8 (bass + lead)" },
    ]
  },
  // Bank LSB: 88 (Synth Pad)
  88: {
    name: "Synth Pad",
    programs: [
        { pc: 88, name: "Pad 1 (new age)" },
        { pc: 89, name: "Pad 2 (warm)" },
        { pc: 90, name: "Pad 3 (polysynth)" },
        { pc: 91, name: "Pad 4 (choir)" },
        { pc: 92, name: "Pad 5 (bowed)" },
        { pc: 93, name: "Pad 6 (metallic)" },
        { pc: 94, name: "Pad 7 (halo)" },
        { pc: 95, name: "Pad 8 (sweep)" },
    ]
  },
  // Bank LSB: 96 (Synth Effects)
  96: {
    name: "Synth Effects",
    programs: [
        { pc: 96, name: "FX 1 (rain)" },
        { pc: 97, name: "FX 2 (soundtrack)" },
        { pc: 98, name: "FX 3 (crystal)" },
        { pc: 99, name: "FX 4 (atmosphere)" },
        { pc: 100, name: "FX 5 (brightness)" },
        { pc: 101, name: "FX 6 (goblins)" },
        { pc: 102, name: "FX 7 (echoes)" },
        { pc: 103, name: "FX 8 (sci-fi)" },
    ]
  },
  // Bank LSB: 104 (Ethnic)
  104: {
    name: "Ethnic",
    programs: [
        { pc: 104, name: "Sitar" },
        { pc: 105, name: "Banjo" },
        { pc: 106, name: "Shamisen" },
        { pc: 107, name: "Koto" },
        { pc: 108, name: "Kalimba" },
        { pc: 109, name: "Bag pipe" },
        { pc: 110, name: "Fiddle" },
        { pc: 111, name: "Shanai" },
    ]
  },
   // Bank LSB: 112 (Percussive)
  112: {
    name: "Percussive",
    programs: [
        { pc: 112, name: "Tinkle Bell" },
        { pc: 113, name: "Agogo" },
        { pc: 114, name: "Steel Drums" },
        { pc: 115, name: "Woodblock" },
        { pc: 116, name: "Taiko Drum" },
        { pc: 117, name: "Melodic Tom" },
        { pc: 118, name: "Synth Drum" },
        { pc: 119, name: "Reverse Cymbal" },
    ]
  },
  // Bank LSB: 120 (Sound Effects)
  120: {
    name: "Sound Effects",
    programs: [
        { pc: 120, name: "Guitar Fret Noise" },
        { pc: 121, name: "Breath Noise" },
        { pc: 122, name: "Seashore" },
        { pc: 123, name: "Bird Tweet" },
        { pc: 124, name: "Telephone Ring" },
        { pc: 125, name: "Helicopter" },
        { pc: 126, name: "Applause" },
        { pc: 127, name: "Gunshot" },
    ]
  },
};

// Drum Kits (Channel 10 specific)
// PDF Page 15 indicates Bank LSB is always 0 for these standard GM2 kits.
export const gm2DrumKits = {
  0: { // Bank LSB 0 
    name: "Standard Kits", // Group name for Bank 0 drums
    programs: [
      { pc: 0, name: "Standard Kit" },   // PDF PC 1
      { pc: 8, name: "Room Kit" },       // PDF PC 9
      { pc: 16, name: "Power Kit" },     // PDF PC 17
      { pc: 24, name: "Electronic Kit" },// PDF PC 25
      { pc: 25, name: "TR-808 Kit" },    // PDF PC 26
      { pc: 32, name: "Jazz Kit" },      // PDF PC 33
      { pc: 40, name: "Brush Kit" },     // PDF PC 41
      { pc: 48, name: "Orchestra Kit" }, // PDF PC 49
      { pc: 56, name: "SFX Kit" }        // PDF PC 57
    ]
  }
  // Add other banks here if the keyboard supports more drum banks (e.g., LSB 1, 2...)
};

// Helper function to get available banks based on channel
export const getAvailableBanks = (channel) => {
  if (channel === 10) {
    return Object.entries(gm2DrumKits).map(([lsb, bankData]) => ({ 
      lsb: parseInt(lsb), 
      name: bankData.name || `Drum Bank ${lsb}` 
    }));
  } else {
     return Object.entries(gm2MelodicSounds).map(([lsb, bankData]) => ({ 
      lsb: parseInt(lsb), 
      name: bankData.name || `Bank ${lsb}` 
    }));
  }
};

// Helper function to get programs/kits for a given channel and bank LSB
export const getProgramsForBank = (channel, bankLsb) => {
  if (channel === 10) {
    return gm2DrumKits[bankLsb]?.programs || [];
  } else {
    return gm2MelodicSounds[bankLsb]?.programs || [];
  }
}; 