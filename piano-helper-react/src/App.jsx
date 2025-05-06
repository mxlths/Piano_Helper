import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Controls from './components/Controls';
import InfoDisplay from './components/InfoDisplay';
import MidiMonitorDisplay from './components/MidiMonitorDisplay';
import WebMidi from 'webmidi';
import PianoKeyboard from './components/PianoKeyboard';
import useMidi from './hooks/useMidi'; // Import the custom hook
import useMetronome from './hooks/useMetronome.js'; // Import the metronome hook
import useDrill from './hooks/useDrill.js'; // <-- Import useDrill
import useMidiPlayer from './hooks/useMidiPlayer.js'; // <-- Import MIDI Player hook
import DrillControls from './components/DrillControls'; // <-- Import DrillControls
import { Scale, Note, Chord, ScaleType, ChordType, PcSet, Interval } from "@tonaljs/tonal"; // Import Tonal functions and Interval
import { RomanNumeral } from "@tonaljs/tonal"; // <-- Import RomanNumeral
import progressionData from './data/progressions.json'; // <-- Import progression data

// console.log("Tonal PcSet object:", PcSet);
// console.log("Tonal Scale object:", Scale); // <-- Add log for Scale object

// --- Constants ---
// const ROOT_NOTES = PcSet.chroma(); // TEMP: PcSet.chroma() returning '000000000000'
const ROOT_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; // <-- Hardcoded workaround
const OCTAVES = [2, 3, 4, 5];
const SCALE_TYPES = ScaleType.names();
const CHORD_TYPES = ChordType.names();
const MODES = [
  { value: 'scale_display', label: 'Scale Display' },
  { value: 'chord_search', label: 'Chord Search' },
  { value: 'diatonic_chords', label: 'Diatonic Chords' },
  { value: 'chord_progression', label: 'Chord Progression' }, // <-- Add new mode
];
const INVERSIONS = [
  { value: 0, label: 'Root Pos' },
  { value: 1, label: '1st Inv' },
  { value: 2, label: '2nd Inv' },
  { value: 3, label: '3rd Inv' }, // Only applicable for 7ths
];

// Define available genres based on the folder structure
const MIDI_GENRES = ['Jazz', 'Latin', 'Funk', 'BluesRock', 'Reggae']; // Add more as needed

// --- UPDATED: Define MIDI files with genres ---
// Note: Update these paths if your public folder setup changes or if vite base changes
const ALL_MIDI_FILES = [
    // Jazz
    { genre: 'Jazz', name: "JBB 9-8 NmlStr Tambourine 141", url: "/midi-files/Jazz/JBB_9-8_NmlStr_Tambourine_141.mid" },
    { genre: 'Jazz', name: "JBB 4-4 NmlStr Triangles 130", url: "/midi-files/Jazz/JBB_4-4_NmlStr_Triangles_130.mid" },
    { genre: 'Jazz', name: "JBB 4-4 NmlStr Toms 129", url: "/midi-files/Jazz/JBB_4-4_NmlStr_Toms_129.mid" },
    { genre: 'Jazz', name: "JBB 3-4 NmlStr Shaker 128", url: "/midi-files/Jazz/JBB_3-4_NmlStr_Shaker_128.mid" },
    { genre: 'Jazz', name: "JBB 3-4 NmlStr Kicks 127", url: "/midi-files/Jazz/JBB_3-4_NmlStr_Kicks_127.mid" },
    { genre: 'Jazz', name: "JBB 3-4 NmlStr HiHats 126", url: "/midi-files/Jazz/JBB_3-4_NmlStr_HiHats_126.mid" },
    { genre: 'Jazz', name: "JBB 3-4 NmlStr Cowbell 125", url: "/midi-files/Jazz/JBB_3-4_NmlStr_Cowbell_125.mid" },
    { genre: 'Jazz', name: "JBB 3-4 NmlMedSwg Snares 124", url: "/midi-files/Jazz/JBB_3-4_NmlMedSwg_Snares_124.mid" },
    { genre: 'Jazz', name: "JBB 3-4 NmlMedSwg Rides 123", url: "/midi-files/Jazz/JBB_3-4_NmlMedSwg_Rides_123.mid" },
    { genre: 'Jazz', name: "JBB 2-4 NmlStr Cabasa 122", url: "/midi-files/Jazz/JBB_2-4_NmlStr_Cabasa_122.mid" },
    { genre: 'Jazz', name: "JBB 12-8 NmlStr Congas 145", url: "/midi-files/Jazz/JBB_12-8_NmlStr_Congas_145.mid" },
    { genre: 'Jazz', name: "JBB 12-8 NmlStr Bongos 144", url: "/midi-files/Jazz/JBB_12-8_NmlStr_Bongos_144.mid" },
    { genre: 'Jazz', name: "JBB 9-8 NmlStr T024 FullKit 117", url: "/midi-files/Jazz/JBB_9-8_NmlStr_T024_FullKit_117.mid" },
    { genre: 'Jazz', name: "JBB 12-8 NmlStr T096 FullKit 120", url: "/midi-files/Jazz/JBB_12-8_NmlStr_T096_FullKit_120.mid" },
    { genre: 'Jazz', name: "JBB 6-8 NmlStr T057 FullKit 115", url: "/midi-files/Jazz/JBB_6-8_NmlStr_T057_FullKit_115.mid" },
    { genre: 'Jazz', name: "JBB 4-4 NmlStr T088 FullKit 109", url: "/midi-files/Jazz/JBB_4-4_NmlStr_T088_FullKit_109.mid" },
    { genre: 'Jazz', name: "JBB 4-4 NmlStr T009 FullKit 110", url: "/midi-files/Jazz/JBB_4-4_NmlStr_T009_FullKit_110.mid" },
    { genre: 'Jazz', name: "JBB 4-4 NmlMedSwg T076 FullKit 108", url: "/midi-files/Jazz/JBB_4-4_NmlMedSwg_T076_FullKit_108.mid" },
    { genre: 'Jazz', name: "JBB 4-4 NmlMedSwg T069 FullKit 106", url: "/midi-files/Jazz/JBB_4-4_NmlMedSwg_T069_FullKit_106.mid" },
    { genre: 'Jazz', name: "JBB 4-4 NmlMedSwg T008 FullKit 107", url: "/midi-files/Jazz/JBB_4-4_NmlMedSwg_T008_FullKit_107.mid" },
    { genre: 'Jazz', name: "JBB 4-4 DblTmMedSwg T017 FullKit 103", url: "/midi-files/Jazz/JBB_4-4_DblTmMedSwg_T017_FullKit_103.mid" },
    { genre: 'Jazz', name: "JBB 4-4 DblTmMedSwg T014 FullKit 104", url: "/midi-files/Jazz/JBB_4-4_DblTmMedSwg_T014_FullKit_104.mid" },
    { genre: 'Jazz', name: "JBB 4-4 DblTmMedSwg T007 FullKit 102", url: "/midi-files/Jazz/JBB_4-4_DblTmMedSwg_T007_FullKit_102.mid" },
    // Latin
    { genre: 'Latin', name: "LS 9-8 NmlStr Triangles 169", url: "/midi-files/Latin/LS_9-8_NmlStr_Triangles_169.mid" },
    { genre: 'Latin', name: "LS 9-8 NmlStr Maracas 168", url: "/midi-files/Latin/LS_9-8_NmlStr_Maracas_168.mid" },
    { genre: 'Latin', name: "LS 9-8 NmlStr Cowbell 167", url: "/midi-files/Latin/LS_9-8_NmlStr_Cowbell_167.mid" },
    { genre: 'Latin', name: "LS 9-8 NmlStr Cabasa 166", url: "/midi-files/Latin/LS_9-8_NmlStr_Cabasa_166.mid" },
    { genre: 'Latin', name: "LS 6-8 NmlStr WoodBlocks 160", url: "/midi-files/Latin/LS_6-8_NmlStr_WoodBlocks_160.mid" },
    { genre: 'Latin', name: "LS 6-8 NmlStr Toms 159", url: "/midi-files/Latin/LS_6-8_NmlStr_Toms_159.mid" },
    { genre: 'Latin', name: "LS 6-8 NmlStr Rides 158", url: "/midi-files/Latin/LS_6-8_NmlStr_Rides_158.mid" },
    { genre: 'Latin', name: "LS 6-8 NmlStr Congas 157", url: "/midi-files/Latin/LS_6-8_NmlStr_Congas_157.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr Tambourine 152", url: "/midi-files/Latin/LS_4-4_NmlStr_Tambourine_152.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr Claves 151", url: "/midi-files/Latin/LS_4-4_NmlStr_Claves_151.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr Bongos 150", url: "/midi-files/Latin/LS_4-4_NmlStr_Bongos_150.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr Agogo 149", url: "/midi-files/Latin/LS_4-4_NmlStr_Agogo_149.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlMedSwg Snares 148", url: "/midi-files/Latin/LS_4-4_NmlMedSwg_Snares_148.mid" },
    { genre: 'Latin', name: "LS 3-4 NmlStr Guiro 147", url: "/midi-files/Latin/LS_3-4_NmlStr_Guiro_147.mid" },
    { genre: 'Latin', name: "LS 2-4 NmlStr Kicks 146", url: "/midi-files/Latin/LS_2-4_NmlStr_Kicks_146.mid" },
    { genre: 'Latin', name: "LS 12-8 NmlStr Timbale 181", url: "/midi-files/Latin/LS_12-8_NmlStr_Timbale_181.mid" },
    { genre: 'Latin', name: "LS 12-8 NmlStr Shaker 180", url: "/midi-files/Latin/LS_12-8_NmlStr_Shaker_180.mid" },
    { genre: 'Latin', name: "LS 12-8 NmlStr HiHats 179", url: "/midi-files/Latin/LS_12-8_NmlStr_HiHats_179.mid" },
    { genre: 'Latin', name: "LS 9-8 NmlStr T061 FullKit 138", url: "/midi-files/Latin/LS_9-8_NmlStr_T061_FullKit_138.mid" },
    { genre: 'Latin', name: "LS 12-8 NmlStr T127 FullKit 141", url: "/midi-files/Latin/LS_12-8_NmlStr_T127_FullKit_141.mid" },
    { genre: 'Latin', name: "LS 12-8 NmlStr T085 FullKit 142", url: "/midi-files/Latin/LS_12-8_NmlStr_T085_FullKit_142.mid" },
    { genre: 'Latin', name: "LS 6-8 NmlStr T101 FullKit 135", url: "/midi-files/Latin/LS_6-8_NmlStr_T101_FullKit_135.mid" },
    { genre: 'Latin', name: "LS 6-8 NmlStr T057 FullKit 134", url: "/midi-files/Latin/LS_6-8_NmlStr_T057_FullKit_134.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr T169 FullKit 129", url: "/midi-files/Latin/LS_4-4_NmlStr_T169_FullKit_129.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr T151 FullKit 126", url: "/midi-files/Latin/LS_4-4_NmlStr_T151_FullKit_126.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr T102 FullKit 127", url: "/midi-files/Latin/LS_4-4_NmlStr_T102_FullKit_127.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr T073 FullKit 128", url: "/midi-files/Latin/LS_4-4_NmlStr_T073_FullKit_128.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlStr T019 FullKit 130", url: "/midi-files/Latin/LS_4-4_NmlStr_T019_FullKit_130.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlMedSwg T001 FullKit 125", url: "/midi-files/Latin/LS_4-4_NmlMedSwg_T001_FullKit_125.mid" },
    { genre: 'Latin', name: "LS 4-4 NmlHrdSwg T004 FullKit 124", url: "/midi-files/Latin/LS_4-4_NmlHrdSwg_T004_FullKit_124.mid" },
    { genre: 'Latin', name: "LS 3-4 NmlStr T066 FullKit 122", url: "/midi-files/Latin/LS_3-4_NmlStr_T066_FullKit_122.mid" },
    { genre: 'Latin', name: "LS 3-4 NmlStr T000 FullKit 123", url: "/midi-files/Latin/LS_3-4_NmlStr_T000_FullKit_123.mid" },
    { genre: 'Latin', name: "LS 2-4 NmlStr T128 FullKit 121", url: "/midi-files/Latin/LS_2-4_NmlStr_T128_FullKit_121.mid" },
    // Funk
    { genre: 'Funk', name: "FNK 9-8 NmlStr WoodBlocks 072", url: "/midi-files/Funk/FNK_9-8_NmlStr_WoodBlocks_072.mid" },
    { genre: 'Funk', name: "FNK 9-8 NmlStr Shaker 071", url: "/midi-files/Funk/FNK_9-8_NmlStr_Shaker_071.mid" },
    { genre: 'Funk', name: "FNK 6-8 NmlStr Triangles 066", url: "/midi-files/Funk/FNK_6-8_NmlStr_Triangles_066.mid" },
    { genre: 'Funk', name: "FNK 6-8 NmlStr Snares 065", url: "/midi-files/Funk/FNK_6-8_NmlStr_Snares_065.mid" },
    { genre: 'Funk', name: "FNK 6-8 NmlStr Kicks 064", url: "/midi-files/Funk/FNK_6-8_NmlStr_Kicks_064.mid" },
    { genre: 'Funk', name: "FNK 6-8 NmlStr HiHats 063", url: "/midi-files/Funk/FNK_6-8_NmlStr_HiHats_063.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr Tambourine 055", url: "/midi-files/Funk/FNK_4-4_NmlStr_Tambourine_055.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr Rides 054", url: "/midi-files/Funk/FNK_4-4_NmlStr_Rides_054.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr Congas 053", url: "/midi-files/Funk/FNK_4-4_NmlStr_Congas_053.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr Bongos 052", url: "/midi-files/Funk/FNK_4-4_NmlStr_Bongos_052.mid" },
    { genre: 'Funk', name: "FNK 3-4 DblTmMedSwg Cabasa 051", url: "/midi-files/Funk/FNK_3-4_DblTmMedSwg_Cabasa_051.mid" },
    { genre: 'Funk', name: "FNK 2-4 NmlStr Cowbell 050", url: "/midi-files/Funk/FNK_2-4_NmlStr_Cowbell_050.mid" },
    { genre: 'Funk', name: "FNK 12-8 NmlStr Toms 075", url: "/midi-files/Funk/FNK_12-8_NmlStr_Toms_075.mid" },
    { genre: 'Funk', name: "FNK 9-8 NmlStr T028 FullKit 056", url: "/midi-files/Funk/FNK_9-8_NmlStr_T028_FullKit_056.mid" },
    { genre: 'Funk', name: "FNK 12-8 NmlStr T029 FullKit 059", url: "/midi-files/Funk/FNK_12-8_NmlStr_T029_FullKit_059.mid" },
    { genre: 'Funk', name: "FNK 6-8 NmlStr T073 FullKit 053", url: "/midi-files/Funk/FNK_6-8_NmlStr_T073_FullKit_053.mid" },
    { genre: 'Funk', name: "FNK 6-8 NmlStr T032 FullKit 052", url: "/midi-files/Funk/FNK_6-8_NmlStr_T032_FullKit_052.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr T083 Synco FullKit 048", url: "/midi-files/Funk/FNK_4-4_NmlStr_T083_Synco_FullKit_048.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr T083 Synco FullKit 046", url: "/midi-files/Funk/FNK_4-4_NmlStr_T083_Synco_FullKit_046.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr T059 FullKit 045", url: "/midi-files/Funk/FNK_4-4_NmlStr_T059_FullKit_045.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr T052 FullKit 047", url: "/midi-files/Funk/FNK_4-4_NmlStr_T052_FullKit_047.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlStr T047 FullKit 044", url: "/midi-files/Funk/FNK_4-4_NmlStr_T047_FullKit_044.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlMedSwg T005 FullKit 043", url: "/midi-files/Funk/FNK_4-4_NmlMedSwg_T005_FullKit_043.mid" },
    { genre: 'Funk', name: "FNK 4-4 NmlHrdSwg T005 FullKit 042", url: "/midi-files/Funk/FNK_4-4_NmlHrdSwg_T005_FullKit_042.mid" },
    { genre: 'Funk', name: "FNK 3-4 NmlStr T030 FullKit 041", url: "/midi-files/Funk/FNK_3-4_NmlStr_T030_FullKit_041.mid" },
    { genre: 'Funk', name: "FNK 2-4 NmlStr T000 FullKit 040", url: "/midi-files/Funk/FNK_2-4_NmlStr_T000_FullKit_040.mid" },
    // BluesRock
    { genre: 'BluesRock', name: "BRnR 9-8 NmlStr Bongos 018", url: "/midi-files/BluesRock/BRnR_9-8_NmlStr_Bongos_018.mid" },
    { genre: 'BluesRock', name: "BRnR 6-8 NmlStr Cabasa 014", url: "/midi-files/BluesRock/BRnR_6-8_NmlStr_Cabasa_014.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlStr Toms 007", url: "/midi-files/BluesRock/BRnR_4-4_NmlStr_Toms_007.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlStr HiHats 006", url: "/midi-files/BluesRock/BRnR_4-4_NmlStr_HiHats_006.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlStr Cowbell 005", url: "/midi-files/BluesRock/BRnR_4-4_NmlStr_Cowbell_005.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlStr Congas 004", url: "/midi-files/BluesRock/BRnR_4-4_NmlStr_Congas_004.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlMedSwg Snares 003", url: "/midi-files/BluesRock/BRnR_4-4_NmlMedSwg_Snares_003.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlMedSwg Rides 002", url: "/midi-files/BluesRock/BRnR_4-4_NmlMedSwg_Rides_002.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlMedSwg Kicks 001", url: "/midi-files/BluesRock/BRnR_4-4_NmlMedSwg_Kicks_001.mid" },
    { genre: 'BluesRock', name: "BRnR 2-4 NmlStr Tambourine 000", url: "/midi-files/BluesRock/BRnR_2-4_NmlStr_Tambourine_000.mid" },
    { genre: 'BluesRock', name: "BRnR 12-8 NmlStr Shaker 021", url: "/midi-files/BluesRock/BRnR_12-8_NmlStr_Shaker_021.mid" },
    { genre: 'BluesRock', name: "BRnR 9-8 NmlStr T036 FullKit 016", url: "/midi-files/BluesRock/BRnR_9-8_NmlStr_T036_FullKit_016.mid" },
    { genre: 'BluesRock', name: "BRnR 12-8 NmlStr T008 FullKit 019", url: "/midi-files/BluesRock/BRnR_12-8_NmlStr_T008_FullKit_019.mid" },
    { genre: 'BluesRock', name: "BRnR 6-8 NmlStr T127 FullKit 011", url: "/midi-files/BluesRock/BRnR_6-8_NmlStr_T127_FullKit_011.mid" },
    { genre: 'BluesRock', name: "BRnR 6-8 NmlStr T046 FullKit 013", url: "/midi-files/BluesRock/BRnR_6-8_NmlStr_T046_FullKit_013.mid" },
    { genre: 'BluesRock', name: "BRnR 6-8 NmlStr T038 FullKit 012", url: "/midi-files/BluesRock/BRnR_6-8_NmlStr_T038_FullKit_012.mid" },
    { genre: 'BluesRock', name: "BRnR 6-8 NmlStr T012 FullKit 010", url: "/midi-files/BluesRock/BRnR_6-8_NmlStr_T012_FullKit_010.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlStr T160 FullKit 006", url: "/midi-files/BluesRock/BRnR_4-4_NmlStr_T160_FullKit_006.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlStr T091 FullKit 005", url: "/midi-files/BluesRock/BRnR_4-4_NmlStr_T091_FullKit_005.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlStr T023 FullKit 004", url: "/midi-files/BluesRock/BRnR_4-4_NmlStr_T023_FullKit_004.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlHrdSwg T003 FullKit 002", url: "/midi-files/BluesRock/BRnR_4-4_NmlHrdSwg_T003_FullKit_002.mid" },
    { genre: 'BluesRock', name: "BRnR 3-4 NmlStr T011 FullKit 001", url: "/midi-files/BluesRock/BRnR_3-4_NmlStr_T011_FullKit_001.mid" },
    { genre: 'BluesRock', name: "BRnR 2-4 NmlStr T076 FullKit 000", url: "/midi-files/BluesRock/BRnR_2-4_NmlStr_T076_FullKit_000.mid" },
    { genre: 'BluesRock', name: "BRnR 4-4 NmlMedSwg T013 FullKit 003", url: "/midi-files/BluesRock/BRnR_4-4_NmlMedSwg_T013_FullKit_003.mid" },
    // Reggae
    { genre: 'Reggae', name: "RS 12-8 NmlStr Tambourine 313", url: "/midi-files/Reggae/RS_12-8_NmlStr_Tambourine_313.mid" },
    { genre: 'Reggae', name: "RS 12-8 NmlStr Kicks 312", url: "/midi-files/Reggae/RS_12-8_NmlStr_Kicks_312.mid" },
    { genre: 'Reggae', name: "RS 9-8 NmlStr T000 FullKit 239", url: "/midi-files/Reggae/RS_9-8_NmlStr_T000_FullKit_239.mid" },
    { genre: 'Reggae', name: "RS 12-8 NmlStr T021 FullKit 243", url: "/midi-files/Reggae/RS_12-8_NmlStr_T021_FullKit_243.mid" },
    { genre: 'Reggae', name: "RS 12-8 NmlStr T020 FullKit 242", url: "/midi-files/Reggae/RS_12-8_NmlStr_T020_FullKit_242.mid" },
    { genre: 'Reggae', name: "RS 12-8 NmlStr T010 FullKit 244", url: "/midi-files/Reggae/RS_12-8_NmlStr_T010_FullKit_244.mid" },
    { genre: 'Reggae', name: "RS 6-8 NmlStr T002 FullKit 236", url: "/midi-files/Reggae/RS_6-8_NmlStr_T002_FullKit_236.mid" },
    { genre: 'Reggae', name: "RS 4-4 NmlStr T020 FullKit 232", url: "/midi-files/Reggae/RS_4-4_NmlStr_T020_FullKit_232.mid" },
    { genre: 'Reggae', name: "RS 4-4 NmlStr T017 FullKit 228", url: "/midi-files/Reggae/RS_4-4_NmlStr_T017_FullKit_228.mid" },
    { genre: 'Reggae', name: "RS 4-4 NmlStr T003 FullKit 230", url: "/midi-files/Reggae/RS_4-4_NmlStr_T003_FullKit_230.mid" },
    { genre: 'Reggae', name: "RS 4-4 NmlMedSwg T000 FullKit 227", url: "/midi-files/Reggae/RS_4-4_NmlMedSwg_T000_FullKit_227.mid" },
    { genre: 'Reggae', name: "RS 4-4 NmlStr T001 FullKit 229", url: "/midi-files/Reggae/RS_4-4_NmlStr_T001_FullKit_229.mid" },
];

function App() {
  // *** Add Render Counter ***
  const renderCount = useRef(0);
  // --- State Management --- MOVE ALL useState here ---
  const [currentMode, setCurrentMode] = useState(MODES[0].value); // Default to 'scale_display'
  const [selectedRootNote, setSelectedRootNote] = useState('C');
  const [selectedOctave, setSelectedOctave] = useState(4);
  const [selectedScaleType, setSelectedScaleType] = useState('major');
  const [selectedChordType, setSelectedChordType] = useState('maj7');
  const [selectedDiatonicDegree, setSelectedDiatonicDegree] = useState(0); // 0-6 index
  const [showSevenths, setShowSevenths] = useState(false);
  const [splitHandVoicing, setSplitHandVoicing] = useState(false);
  const [rhInversion, setRhInversion] = useState(0); // 0-3 index
  const [splitHandInterval, setSplitHandInterval] = useState(24);
  const [availableProgressions, setAvailableProgressions] = useState(progressionData);
  const [selectedProgressionId, setSelectedProgressionId] = useState(progressionData[0]?.id || null);
  const [latestMidiEvent, setLatestMidiEvent] = useState(null);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillNumOctaves, setDrillNumOctaves] = useState(1);
  const [drillRepetitions, setDrillRepetitions] = useState(1);
  const [drillStyle, setDrillStyle] = useState('ascending');
  const [drillOptions, setDrillOptions] = useState({});
  // --- NEW: Voicing State ---
  const [voicingSplitHand, setVoicingSplitHand] = useState(false);
  const [voicingLhOctaveOffset, setVoicingLhOctaveOffset] = useState(-12); // Semitones (-12 or -24)
  const [voicingRhRootless, setVoicingRhRootless] = useState(false);
  const [voicingUseShell, setVoicingUseShell] = useState(false);
  const [voicingAddOctaveRoot, setVoicingAddOctaveRoot] = useState(false);
  // --- NEW: MIDI Backing Track Genre State ---
  const [selectedMidiGenre, setSelectedMidiGenre] = useState(MIDI_GENRES[0]); // Default to first genre
  // --- REMOVE State for MIDI Initialization Status --- 
  // const [midiInitializedStatus, setMidiInitializedStatus] = useState(false);
  const [isMidiReady, setIsMidiReady] = useState(false); // Renamed state

  // *** Define callback for MIDI initialization HERE ***
  const handleMidiInitialized = () => { // No longer accepts lists
    console.log("[App.jsx] handleMidiInitialized signal received! Setting isMidiReady.");
    setIsMidiReady(true);
    // Fetch devices DIRECTLY from WebMidi object now that it's enabled
    if (WebMidi.enabled) {
      console.log("[App.jsx] Fetching devices directly from WebMidi...");
      const inputs = WebMidi.inputs.map(i => ({ id: i.id, name: i.name }));
      const outputs = WebMidi.outputs.map(o => ({ id: o.id, name: o.name }));
      console.log("[App.jsx] Fetched Inputs:", inputs);
      console.log("[App.jsx] Fetched Outputs:", outputs);
      setAvailableMidiInputs(inputs || []);
      setAvailableMidiOutputs(outputs || []);
    } else {
      console.warn("[App.jsx] handleMidiInitialized called, but WebMidi is not enabled? Cannot fetch devices.");
      setAvailableMidiInputs([]);
      setAvailableMidiOutputs([]);
    }
  };
  
      // --- State for MIDI Device Lists ---
      const [availableMidiInputs, setAvailableMidiInputs] = useState([]);
      const [availableMidiOutputs, setAvailableMidiOutputs] = useState([]);

  // Memoized array version for props that need it (like PianoKeyboard)
  const activeNotesArray = useMemo(() => Array.from(activeNotes), [activeNotes]);

  useEffect(() => {
    renderCount.current++;
    console.log(`App.jsx Render Count: ${renderCount.current}`);
  }); // No dependency array, runs on every render

  // --- Calculated Values (Moved Before Hooks that Depend on Them) ---
  const selectedRootWithOctave = useMemo(() => `${selectedRootNote}${selectedOctave}`, [selectedRootNote, selectedOctave]);
  const rootNoteMidi = useMemo(() => Note.midi(selectedRootWithOctave), [selectedRootWithOctave]);
  const scaleName = useMemo(() => `${selectedRootNote} ${selectedScaleType}`, [selectedRootNote, selectedScaleType]);
  const scaleInfo = useMemo(() => {
      const info = Scale.get(scaleName);
      return info;
  }, [scaleName]);

  // Get FULL diatonic triad and seventh chord names
  const diatonicTriads = useMemo(() => {
      try {
        const degrees = Scale.degrees(scaleName);
        if (typeof degrees !== 'function') return []; // Ensure degrees is a function
        const chords = [];
        for (let i = 1; i <= 7; i++) {
            const tonic = degrees(i);    // 1st degree note
            const third = degrees(i + 2);  // 3rd degree note (relative to tonic)
            const fifth = degrees(i + 4);  // 5th degree note (relative to tonic)
            if (!tonic || !third || !fifth) continue; // Skip if notes are invalid
            
            // Detect chord based on notes
            const detected = Chord.detect([tonic, third, fifth]);
            // Prefer simpler names, or just take the first
            const chordName = detected.length > 0 ? detected[0] : `${tonic}?`; // Fallback name
            chords.push(chordName);
        }
        // console.log(`App.jsx - Calculated Diatonic Triads for ${scaleName}:`, chords); // Log results
        return chords.length === 7 ? chords : []; // Ensure we have 7 chords
      } catch (e) {
          console.error(`Error building triads for ${scaleName}:`, e); return [];
      }
  }, [scaleName]); // Depend only on scaleName

  const diatonicSevenths = useMemo(() => { 
     try {
        const degrees = Scale.degrees(scaleName);
        if (typeof degrees !== 'function') return [];
        const chords = [];
        for (let i = 1; i <= 7; i++) {
            const tonic = degrees(i);
            const third = degrees(i + 2);
            const fifth = degrees(i + 4);
            const seventh = degrees(i + 6); // 7th degree note (relative to tonic)
            if (!tonic || !third || !fifth || !seventh) continue;

            const detected = Chord.detect([tonic, third, fifth, seventh]);
            const chordName = detected.length > 0 ? detected[0] : `${tonic}?7`; // Fallback name
            chords.push(chordName);
        }
        // console.log(`App.jsx - Calculated Diatonic Sevenths for ${scaleName}:`, chords); // Log results
        return chords.length === 7 ? chords : [];
     } catch (e) {
         console.error(`Error building 7th chords for ${scaleName}:`, e); return [];
     }
  }, [scaleName]); // Depend only on scaleName

  // --- Calculated Diatonic Chord Notes (Moved Up for Drills) ---
  const calculatedDiatonicChordNotes = useMemo(() => {
      console.log("App.jsx: Recalculating calculatedDiatonicChordNotes...");
      const rootWithOctave = `${selectedRootNote}${selectedOctave}`;
      const scaleInfo = Scale.get(scaleName);
      const targetChords = showSevenths ? diatonicSevenths : diatonicTriads;
      const allChordNotes = [];

      if (scaleInfo.empty || !Array.isArray(scaleInfo.intervals) || scaleInfo.intervals.length < 7) {
          console.warn("App.jsx - Diatonic Drill Calc - Returning [] due to invalid scale intervals.", { scaleName: scaleName, scaleInfoEmpty: scaleInfo.empty, scaleIntervals: scaleInfo.intervals });
          return [];
      }
      if (!Array.isArray(targetChords) || targetChords.length < 7) {
          console.warn("App.jsx - Diatonic Drill Calc - Returning [] due to invalid base chord names.", { showSevenths: showSevenths, diatonicTriadsLength: diatonicTriads?.length, diatonicSeventhsLength: diatonicSevenths?.length, targetChordsLength: targetChords?.length });
          return []; // Return empty if base chords aren't ready
      }

      const scaleIntervals = scaleInfo.intervals;

      for (let degree = 0; degree < 7; degree++) {
          let currentDegreeChordNotes = []; // MIDI notes for this specific degree
          const fullChordName = targetChords[degree]; // e.g., "Cm"
          const interval = scaleIntervals[degree]; // e.g., "5P"
          
          if (!fullChordName || !interval) continue; // Skip if name or interval invalid

          try {
              // 1. Determine the correct root note with octave based on scale intervals
              const correctChordRoot = Note.transpose(rootWithOctave, interval); 
              if (!correctChordRoot || Note.midi(correctChordRoot) === null) {
                 console.warn(`App.jsx - Diatonic Drill Calc - Invalid root ${correctChordRoot} for degree ${degree+1}`);
                 continue;
              }
              const correctChordRootMidi = Note.midi(correctChordRoot); // Needed for split hand calc

              // 2. Get the chord type alias from the full name (e.g., "m" from "Cm")
              const chordDataForType = Chord.get(fullChordName);
              if (chordDataForType.empty) {
                  console.warn(`App.jsx - Diatonic Drill Calc - Could not parse chord ${fullChordName} to get type.`);
                  continue;
              }
              const chordTypeAlias = chordDataForType.aliases?.[0];
              if (!chordTypeAlias) {
                  console.warn(`App.jsx - Diatonic Drill Calc - Could not get type alias for ${fullChordName}.`);
                  continue;
              }

              // 3. Get chord notes using the correct type AND the correct root+octave
              const chordData = Chord.getChord(chordTypeAlias, correctChordRoot);
              if (chordData.empty || !Array.isArray(chordData.notes) || chordData.notes.length === 0) {
                 console.warn(`App.jsx - Diatonic Drill Calc - Failed to get notes for ${chordTypeAlias} at ${correctChordRoot}.`);
                 continue;
              }

              let chordNotes = chordData.notes; // Note names with correct octave

              // 4. Apply RH Inversion (operates on note names, should be fine)
              if (rhInversion > 0 && rhInversion < chordNotes.length) {
                  const inversionSlice = chordNotes.slice(0, rhInversion);
                  const remainingSlice = chordNotes.slice(rhInversion);
                  const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P'));
                  chordNotes = [...remainingSlice, ...invertedNotes];
              }

              // --- Apply Shell Voicing (AFTER inversion, BEFORE split hand) ---
              let notesForVoicing = chordNotes; // Start with potentially inverted notes
              if (voicingUseShell) {
                   const chordInfo = Chord.get(fullChordName); // Get info from the diatonic name
                   if (!chordInfo.empty && chordInfo.intervals) {
                       const intervalsToKeep = new Set(['1P']);
                       const thirdInterval = chordInfo.intervals.find(ivl => ivl.startsWith('3'));
                       if (thirdInterval) intervalsToKeep.add(thirdInterval);
                       const seventhInterval = chordInfo.intervals.find(ivl => ivl.startsWith('7'));
                       if (seventhInterval) intervalsToKeep.add(seventhInterval);

                       const shellNotes = [];
                       const originalRootNote = Note.get(correctChordRoot); // Use correct root+octave
                       for (const interval of intervalsToKeep) {
                          const noteName = Note.transpose(originalRootNote, interval);
                          shellNotes.push(noteName);
                       }
                       notesForVoicing = shellNotes; // Replace with shell notes
                       console.log(`App.jsx (Diatonic/Shell): Applied shell voicing to ${fullChordName}. Notes:`, notesForVoicing);
                   } else {
                        console.warn(`App.jsx (Diatonic/Shell): Could not get chord info for ${fullChordName} to apply shell voicing. Skipping.`);
                   }
              }

              // 5. Convert to MIDI
              let midiNotes = notesForVoicing.map(Note.midi).filter(Boolean);
              if (midiNotes.length === 0) continue;

              // 6. Apply Split Hand Voicing (using correctChordRootMidi)
              if (splitHandVoicing) {
                  let rhMidiNotesForSplit = midiNotes; // Notes after potential inversion
                  
                  // Apply Rootless RH *before* combining with LH
                  if (voicingRhRootless) {
                      // Find the MIDI value of the root note in *this specific octave*
                      const currentRootMidi = Note.midi(correctChordRoot); 
                      if (currentRootMidi !== null) {
                         rhMidiNotesForSplit = midiNotes.filter(note => note !== currentRootMidi);
                         console.log(`App.jsx (Diatonic/Split/Rootless): RH notes for ${fullChordName} after root ${currentRootMidi} removal:`, rhMidiNotesForSplit);
                      } else {
                          console.warn(`App.jsx (Diatonic/Split/Rootless): Could not get MIDI for root ${correctChordRoot} to apply rootless voicing.`);
                      }
                  }

                  if (correctChordRootMidi !== null && correctChordRootMidi >= splitHandInterval) {
                      const actualLhNote = correctChordRootMidi - splitHandInterval;
                      // Combine LH note with potentially rootless RH notes
                      if (actualLhNote >= 0 && actualLhNote <= 127) {
                          currentDegreeChordNotes = [actualLhNote, ...rhMidiNotesForSplit];
                      } else {
                          console.warn(`App.jsx (Diatonic/Split): Calculated LH note ${actualLhNote} is out of MIDI range. Using RH notes only.`);
                          currentDegreeChordNotes = rhMidiNotesForSplit; // Use potentially rootless notes
                      }
                  } else {
                      currentDegreeChordNotes = rhMidiNotesForSplit; // Fallback if split fails, use potentially rootless notes
                  }
              } else {
                  currentDegreeChordNotes = midiNotes; // No split hand, use inverted notes
              }
              
              // Filter & sort MIDI notes
               currentDegreeChordNotes = currentDegreeChordNotes.filter(n => n !== null && n >= 0 && n <= 127).sort((a,b)=> a-b);

          } catch (error) {
              console.error(`Error calculating notes for degree ${degree} (${fullChordName}):`, error);
              currentDegreeChordNotes = []; // Reset on error for this degree
          }
          
          allChordNotes.push(currentDegreeChordNotes); 
      }

      console.log("App.jsx: Finished calculating MIDI notes for diatonic chords. Returning valid array.");
      return allChordNotes; // Should be array of 7 arrays (some might be empty if errors occurred)

  }, [
      scaleName, selectedOctave, selectedRootNote, // <-- Need scale info for intervals/root
      showSevenths, diatonicTriads, diatonicSevenths, // Base chords
      rhInversion, splitHandVoicing, splitHandInterval, // Modifiers
      voicingRhRootless, // <-- Add dependency for rootless logic
      voicingUseShell, // <-- Add shell dependency
      voicingAddOctaveRoot // <-- Add octave root dependency
  ]);

  // --- NEW: Transpose Selected Chord Progression ---
  const calculatedProgressionChords = useMemo(() => {
    console.log("App.jsx: Recalculating calculatedProgressionChords START", { voicingSplitHand, voicingLhOctaveOffset, voicingRhRootless, voicingUseShell, voicingAddOctaveRoot }); // <-- LOG START
    console.log(`App.jsx: Recalculating progression chords for ID: ${selectedProgressionId} in key: ${scaleName} octave: ${selectedOctave}`);
    if (!selectedProgressionId || !availableProgressions.find(p => p.id === selectedProgressionId) || !scaleName || scaleInfo.empty) {
      console.log("App.jsx: Progression calc returning early: Invalid ID, scale name, scale info, or progression object not found.");
      return []; // <- Potential exit 1
    }

    const selectedProg = availableProgressions.find(p => p.id === selectedProgressionId);
    if (!selectedProg.progression || selectedProg.progression.length === 0) {
      console.log(`App.jsx: Progression calc returning early: Progression array for ID ${selectedProgressionId} is missing or empty.`);
      return []; // <- Potential exit 2
    }

    const chords = [];
    const scaleNotes = scaleInfo.notes;
    const scaleDegreeGetter = Scale.degrees(scaleName); // Function to get note for degree
    const currentDiatonicChords = showSevenths ? diatonicSevenths : diatonicTriads; // Use pre-calculated names

    console.log(`App.jsx: Processing progression: [${selectedProg.progression.join(', ')}] in key ${scaleName}`);

    for (const romanNumeral of selectedProg.progression) { // romanNumeral is a STRING like "I"
      try {
        // 1. Analyze the Roman numeral string
        const analysis = RomanNumeral.get(romanNumeral); // { name: "vi", roman: "vi", step: 5, ... }
        console.log(`App.jsx: RomanNumeral analysis for "${romanNumeral}":`, analysis); // <-- ADD LOG
        if (analysis.empty) {
            console.warn(`App.jsx: Could not analyze Roman numeral: ${romanNumeral}`);
            chords.push({ roman: romanNumeral, name: `? (${romanNumeral})`, notes: [], midiNotes: [], error: 'Analysis failed' });
            continue;
        }

        // 1.5 Check if the step is valid *before* using it with the scale getter
        if (typeof analysis.step !== 'number' || analysis.step < 0 || analysis.step > 6) { // Check 0-6
           console.warn(`App.jsx: Roman numeral analysis for "${romanNumeral}" returned an invalid step: ${analysis.step}. Skipping chord generation for this step.`);
           // TODO: Potentially handle altered roots using analysis.interval? For now, skip.
           chords.push({ roman: romanNumeral, name: `? (${romanNumeral})`, notes: [], midiNotes: [], error: 'Invalid step from analysis' });
           continue;
       }

        // 2. Determine the chord root note name using the scale and step+1
        const chordRootNote = scaleDegreeGetter(analysis.step + 1); // Use step+1 for 1-based getter
        if (!chordRootNote) {
             console.warn(`App.jsx: Could not find scale degree ${analysis.step + 1} for ${scaleName}`);
             chords.push({ roman: romanNumeral, name: `?${analysis.chordType || ''}`, notes: [], midiNotes: [], error: 'Degree note not found' });
             continue;
         }

        // --- Determine Chord Type Alias using PRE-CALCULATED Diatonic Chords --- 
        const degreeIndex = analysis.step; // 0-based index for arrays
        const targetDiatonicChords = showSevenths ? diatonicSevenths : diatonicTriads;
        let chordTypeAlias = '';
        let fullChordName = `? (${romanNumeral})`; // Default fallback name

        if (degreeIndex >= 0 && degreeIndex < targetDiatonicChords.length && targetDiatonicChords[degreeIndex]) {
            const diatonicChordName = targetDiatonicChords[degreeIndex];
            // Validate that the diatonic chord root matches the step's expected root
            if (diatonicChordName.startsWith(chordRootNote)) {
                fullChordName = diatonicChordName; // Use the full diatonic name (e.g., Dm7)
                const chordDataTemp = Chord.get(fullChordName);
                if (!chordDataTemp.empty && chordDataTemp.aliases?.[0]) {
                    chordTypeAlias = chordDataTemp.aliases[0]; // Get alias like 'm7'
                    console.log(`App.jsx: Using diatonic chord ${fullChordName} for ${romanNumeral}. Alias: ${chordTypeAlias}`);
                } else {
                    console.warn(`App.jsx: Could not get valid alias from diatonic chord name: ${fullChordName}`);
                    // Keep fullChordName but alias remains empty, might cause issues later
                }
            } else {
                 console.warn(`App.jsx: Mismatch between expected root ${chordRootNote} (from step ${analysis.step+1}) and diatonic chord root ${diatonicChordName} at index ${degreeIndex}. This might happen with altered chords (bVII etc) or errors.`);
                 // Attempt fallback using analysis.chordType? Or just fail?
                 // For now, let's try building from analysis again as a basic fallback for non-diatonic numerals
                 chordTypeAlias = analysis.chordType || (showSevenths ? '7' : 'M'); // Basic fallback based on numeral type
                 fullChordName = `${chordRootNote}${chordTypeAlias}`;
                 console.log(`App.jsx: Using fallback alias ${chordTypeAlias} for ${romanNumeral}. Built name: ${fullChordName}`);
            }
        } else {
             console.warn(`App.jsx: Could not find valid diatonic chord for degree index ${degreeIndex} (from Roman ${romanNumeral}).`);
             // Fallback for safety
             chordTypeAlias = analysis.chordType || (showSevenths ? '7' : 'M');
             fullChordName = `${chordRootNote}${chordTypeAlias}`;
        }

        if (!chordTypeAlias) {
            console.warn(`App.jsx: Still couldn't determine valid chord type alias for ${romanNumeral} -> ${fullChordName}`);
            chords.push({ roman: romanNumeral, name: fullChordName, notes: [], midiNotes: [], error: 'Failed to determine chord type' });
            continue;
        }

        // 4. Get chord notes with the correct octave
        const chordRootWithOctave = `${chordRootNote}${selectedOctave}`; // Assume base octave for now
        const chordData = Chord.getChord(chordTypeAlias, chordRootWithOctave);

        if (chordData.empty || !chordData.notes || chordData.notes.length === 0) {
            console.warn(`App.jsx: Failed to get notes for type "${chordTypeAlias}" at root "${chordRootWithOctave}" (derived from ${romanNumeral})`);
            chords.push({ roman: romanNumeral, name: fullChordName, notes: [], midiNotes: [], error: 'Note generation failed' });
            continue;
        }

        // --- Apply RH Inversion BEFORE Split Hand --- 
        let rhChordNotes = chordData.notes; // Note names with octave
        if (rhInversion > 0 && rhInversion < rhChordNotes.length) {
             const inversionSlice = rhChordNotes.slice(0, rhInversion);
             const remainingSlice = rhChordNotes.slice(rhInversion);
             const invertedNotes = inversionSlice.map(n => Note.transpose(n, '8P'));
             rhChordNotes = [...remainingSlice, ...invertedNotes];
            console.log(`App.jsx (Inversion): Applied RH inversion ${rhInversion} to ${fullChordName}. Notes:`, rhChordNotes);
        }

        // --- Apply Shell Voicing (AFTER inversion, BEFORE split hand) ---
        if (voicingUseShell) {
             const chordInfo = Chord.get(fullChordName); // Get intervals for the full chord name
             if (!chordInfo.empty && chordInfo.intervals) {
                 const intervalsToKeep = new Set(['1P']); // Always keep root
                 // Find 3rd (major or minor)
                 const thirdInterval = chordInfo.intervals.find(ivl => ivl.startsWith('3'));
                 if (thirdInterval) intervalsToKeep.add(thirdInterval);
                 // Find 7th (major, minor, or dominant)
                 const seventhInterval = chordInfo.intervals.find(ivl => ivl.startsWith('7'));
                 if (seventhInterval) intervalsToKeep.add(seventhInterval);

                 const shellNotes = [];
                 const originalRootNote = Note.get(chordRootWithOctave); // Root note object
                 for (const interval of intervalsToKeep) {
                    const noteName = Note.transpose(originalRootNote, interval);
                    shellNotes.push(noteName);
                 }
                 rhChordNotes = shellNotes; // Replace with shell notes
                 console.log(`App.jsx (Shell): Applied shell voicing to ${fullChordName}. Kept intervals: [${Array.from(intervalsToKeep).join(', ')}]. Notes:`, rhChordNotes);
             } else {
                 console.warn(`App.jsx (Shell): Could not get chord info for ${fullChordName} to apply shell voicing. Skipping.`);
             }
        }

        // 5. Convert notes to MIDI and sort
        let finalMidiNotes = [];
        const rootMidiNote = Note.midi(chordRootWithOctave);
        // rhChordNotes is now potentially inverted

        if (voicingSplitHand && rootMidiNote !== null) {
            // --- Split Hand Logic --- 
            const lhNoteMidi = rootMidiNote + voicingLhOctaveOffset;
            
            // RH Chord Notes (Potentially Rootless)
            let rhNotesToConvert = rhChordNotes;
            if (voicingRhRootless) {
                // Filter out the root note *name* before MIDI conversion
                const rootNoteName = Note.pitchClass(chordRootWithOctave);
                rhNotesToConvert = rhChordNotes.filter(noteName => Note.pitchClass(noteName) !== rootNoteName);
                console.log(`App.jsx (Split/Rootless): RH notes for ${fullChordName} after root removal:`, rhNotesToConvert);
            }

            const rhMidiNotes = rhNotesToConvert.map(Note.midi).filter(n => n !== null && n >= 0 && n <= 127);
            
            // Combine LH and RH, ensuring LH note is valid
            if (lhNoteMidi >= 0 && lhNoteMidi <= 127) {
                finalMidiNotes = [lhNoteMidi, ...rhMidiNotes].sort((a, b) => a - b);
            } else {
                console.warn(`App.jsx (Split Hand): Calculated LH note ${lhNoteMidi} is out of MIDI range. Using RH notes only.`);
                finalMidiNotes = rhMidiNotes.sort((a, b) => a - b);
            }
            console.log(`App.jsx (Split Hand): Final MIDI for ${fullChordName}: LH ${lhNoteMidi}, RH [${rhMidiNotes.join(', ')}] -> [${finalMidiNotes.join(', ')}]`);

        } else {
            // --- Standard Voicing Logic --- 
             finalMidiNotes = rhChordNotes.map(Note.midi).filter(n => n !== null && n >= 0 && n <= 127).sort((a, b) => a - b);
             console.log(`App.jsx (Standard): Final MIDI for ${fullChordName}: [${finalMidiNotes.join(', ')}]`);
        }

        // --- Apply Add Upper Octave Root (AFTER split hand/rootless) ---
        if (voicingAddOctaveRoot && finalMidiNotes.length > 0) {
            // Find the lowest MIDI note corresponding to the root pitch class
            const rootPc = Note.pitchClass(chordRootWithOctave);
            const lowestRootMidi = finalMidiNotes.find(midi => Note.pitchClass(Note.fromMidi(midi)) === rootPc);

            if (lowestRootMidi !== undefined) {
                const upperRootMidi = lowestRootMidi + 12;
                if (upperRootMidi <= 127 && !finalMidiNotes.includes(upperRootMidi)) {
                    finalMidiNotes.push(upperRootMidi);
                    finalMidiNotes.sort((a, b) => a - b);
                    console.log(`App.jsx (Diatonic/Add Oct Root): Added upper octave root (${upperRootMidi}) to ${fullChordName}. Notes before sort: [${finalMidiNotes.join(', ')}]`);
                }
            } else {
                 console.warn(`App.jsx (Diatonic/Add Oct Root): Could not find root note MIDI value in final notes for ${fullChordName} to add octave.`);
            }
        }

        console.log(`App.jsx: Successfully processed ${romanNumeral} -> ${fullChordName}. FINAL MIDI: [${finalMidiNotes.join(', ')}]`); // <-- Log the FINAL result
        chords.push({
          roman: romanNumeral,
          name: fullChordName,
          notes: chordData.notes, // Keep original theoretical notes
          midiNotes: finalMidiNotes // Use the FINAL calculated MIDI notes with voicing
        });

      } catch (error) {
        console.error(`App.jsx: Error processing Roman numeral "${romanNumeral}" in progression "${selectedProg.name}":`, error);
        chords.push({ roman: romanNumeral, name: `? (${romanNumeral})`, notes: [], midiNotes: [], error: error.message });
      }
    }
    console.log("App.jsx: Finished calculating progression chords:", chords);
    return chords;
  }, [
      selectedProgressionId, availableProgressions, scaleName, scaleInfo, selectedOctave, 
      showSevenths, diatonicTriads, diatonicSevenths, 
      voicingSplitHand, voicingLhOctaveOffset, voicingRhRootless,
      voicingUseShell, voicingAddOctaveRoot
  ]); // Keep dependencies

  // --- MIDI Callback Handlers (Defined in App.jsx) ---
  const handleNoteOn = useCallback((event) => {
    setLatestMidiEvent(event); // Update the latest event state
    setActiveNotes(prev => new Set(prev).add(event.note)); // Add note to active set
  }, []); // No dependencies needed, updates state within App

  const handleNoteOff = useCallback((event) => {
    setLatestMidiEvent(event); // Update the latest event state (even for note off)
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(event.note); // Remove note from active set
      return next;
    });
  }, []); // No dependencies needed

  // --- Instantiate Hooks ---

  // ** Call useMidi FIRST and pass callbacks **
  const midiHookResult = useMidi({ 
    onNoteOn: handleNoteOn, 
    onNoteOff: handleNoteOff, 
    onInitialized: handleMidiInitialized // Pass the new handler
  });
  // *** Log the entire object returned by the hook ***
  console.log('[App.jsx] Raw return value from useMidi():', midiHookResult);

    // *** Destructure ONLY what's needed now (selectors, sendMessage, logs) ***
    const {
      // midiInputs = [], // <-- REMOVED, using state
      // midiOutputs = [], // <-- REMOVED, using state
      selectedInputId,
      selectedOutputId,
      logMessages,
      selectInput,
      selectOutput,
      sendMessage,
     } = midiHookResult || {};

  // ** Instantiate useMidiPlayer AFTER useMidi **
  const {
      playbackState,
      loadedFileName: loadedMidiFileName, // <-- RENAME HERE
      loadMidiFile,
      play: playMidiFile,
      pause: pauseMidiFile,
      stop: stopMidiFile,
  } = useMidiPlayer(sendMessage); // <-- Pass sendMessage

  // ** Instantiate useDrill AFTER useMidi **
  const {
    currentDrillStep: drillStepData, // The actual variable name
    drillScore: currentDrillScore
  } = useDrill({
    isDrillActive,
    currentMode,
    drillOptions, // Pass the combined options object
    scaleName,
    selectedChordType,
    diatonicTriads, 
    diatonicSevenths, 
    selectedOctave, 
    showSevenths, 
    splitHandVoicing, 
    splitHandInterval, 
    rhInversion, 
    playedNoteEvent: latestMidiEvent, // Pass the state variable from App.jsx
    calculatedDiatonicChordNotes, 
    selectedRootNote, 
    ROOT_NOTES,
    // Progression Props for Drill <-- NEW
    transposedProgressionChords: calculatedProgressionChords
  });

  // ** Instantiate useMetronome AFTER useMidi **
  const {
    isMetronomePlaying,
    metronomeBpm,
    metronomeSoundNote, // The currently selected MIDI note value
    metronomeTimeSignature,
    metronomeSounds,   // The original object: { name: note, ... }
    toggleMetronome,
    changeMetronomeTempo,
    changeMetronomeSound, // Handler expects the note value
    changeMetronomeTimeSignature,
  } = useMetronome(sendMessage); // Pass sendMessage

  // *** Convert metronomeSounds object to an array for MUI Select ***
  const metronomeSoundsArray = useMemo(() => {
    // Ensure metronomeSounds is an object before trying to convert
    if (typeof metronomeSounds === 'object' && metronomeSounds !== null) {
      return Object.entries(metronomeSounds).map(([name, note]) => ({ name, note }));
    }
    return []; // Return empty array if not an object
  }, [metronomeSounds]);

  // --- Calculated Values ---
  const notesToHighlight = useMemo(() => {
    console.log("App.jsx: Recalculating notesToHighlight START"); // <-- LOG START
    console.log("App.jsx: Recalculating notesToHighlight...");
    let calculatedNotes = [];
    const octave = selectedOctave;
    const rootName = selectedRootNote;

    try {
      if (currentMode === 'scale_display' && selectedScaleType) {
        const scaleData = Scale.get(scaleName); // Use calculated scaleName
        if (scaleData && Array.isArray(scaleData.notes)) {
          const notesInOctave = scaleData.notes.map(noteName => Note.midi(`${noteName}${octave}`)).filter(Boolean);
          const notesInNextOctave = scaleData.notes.map(noteName => Note.midi(`${noteName}${octave + 1}`)).filter(Boolean);
          calculatedNotes = [...notesInOctave, ...notesInNextOctave];
        }
      } else if (currentMode === 'chord_search' && selectedChordType) {
         if (!rootNoteMidi) return [];
         const chordData = Chord.getChord(selectedChordType, `${rootName}${octave}`); // Use getChord for root+octave
         if (chordData && Array.isArray(chordData.notes)) {
           calculatedNotes = chordData.notes.map(Note.midi).filter(Boolean);
         }
      } else if (currentMode === 'diatonic_chords') {
        // --- REVISED LOGIC --- 
        // Use the pre-calculated notes from calculatedDiatonicChordNotes hook
        if (Array.isArray(calculatedDiatonicChordNotes) && 
            selectedDiatonicDegree >= 0 && 
            selectedDiatonicDegree < calculatedDiatonicChordNotes.length) {
            
            calculatedNotes = calculatedDiatonicChordNotes[selectedDiatonicDegree] || []; 
            // console.log(`App.jsx - Diatonic Highlight - Using pre-calculated notes for degree ${selectedDiatonicDegree}:`, calculatedNotes);
        } else {
            console.warn(`App.jsx - Diatonic Highlight - Pre-calculated notes not available or degree invalid.`);
            calculatedNotes = [];
        }
      } else if (currentMode === 'chord_progression') {
        // Highlight all unique notes across all chords in the transposed progression
        if (calculatedProgressionChords && calculatedProgressionChords.length > 0) {
            const allMidiNotes = calculatedProgressionChords.flatMap(chord => chord.midiNotes || []);
            calculatedNotes = [...new Set(allMidiNotes)]; // Use Set to get unique notes
            console.log(`App.jsx - Progression Highlight - Highlighting notes:`, calculatedNotes);
        } else {
             console.log(`App.jsx - Progression Highlight - No transposed chords available.`);
             calculatedNotes = [];
        }
      }
    } catch (error) {
      console.error("Error calculating notes:", error);
      calculatedNotes = []; // Return empty array on error
    }

    // Filter final notes
    // console.log('App.jsx - notesToHighlight before filter:', calculatedNotes);
    return calculatedNotes.filter(n => n !== null && n >= 0 && n <= 127);

  }, [
      currentMode, 
      // Scale Display deps:
      scaleName, selectedOctave,
      // Chord Search deps:
      selectedChordType, selectedRootNote, // Keep octave here too for chord root
      // Diatonic Chords deps:
      selectedDiatonicDegree, 
      calculatedDiatonicChordNotes, // <-- Add dependency 
      // Progression Mode deps:
      calculatedProgressionChords, // <-- Depend on the calculated value
      // Voicing dependencies for highlighting?
      voicingSplitHand, voicingLhOctaveOffset, voicingRhRootless, 
      voicingUseShell, voicingAddOctaveRoot
  ]);

  // Find the full selected progression object
  const selectedProgressionObject = useMemo(() => {
      return availableProgressions.find(p => p.id === selectedProgressionId);
  }, [selectedProgressionId, availableProgressions]);

  // --- Event Handlers ---
  const handleModeChange = (newMode) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Mode change.');
    }
    console.log(`App.jsx: handleModeChange - New Mode: ${newMode}`);
    setCurrentMode(newMode);
    // Reset related states when mode changes? e.g., reset drill, progression
  };

  const handleRootChange = (newRoot) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Root Note change.');
    }
    console.log(`App.jsx: handleRootChange - New Root: ${newRoot}`);
    setSelectedRootNote(newRoot);
  };

  const handleOctaveChange = (newOctave) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Octave change.');
    }
    // Ensure octave is treated as a number
    const octaveNum = parseInt(newOctave, 10);
    console.log(`App.jsx: handleOctaveChange - New Octave: ${octaveNum}`);
    setSelectedOctave(octaveNum);
  };

  const handleScaleChange = (newScale) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Scale change.');
    }
     // Reset diatonic degree when scale changes to avoid potential errors
    console.log(`App.jsx: handleScaleChange - New Scale: ${newScale}. Resetting diatonic degree.`);
    setSelectedScaleType(newScale);
    setSelectedDiatonicDegree(0); // Reset degree index
    // Reset progression selection? Depends on desired behavior
    // setSelectedProgressionId(null); 
  };

   const handleChordChange = (newChord) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Chord Type change.');
    }
     console.log(`App.jsx: handleChordChange - New Chord: ${newChord}`);
     setSelectedChordType(newChord);
   };

  // --- Diatonic Mode Handlers ---
  const handleDiatonicDegreeChange = (index) => {
     // Ensure index is treated as a number
     const degreeIndex = parseInt(index, 10);
    console.log(`App.jsx: handleDiatonicDegreeChange - New Degree Index: ${degreeIndex}`);
     setSelectedDiatonicDegree(degreeIndex);
  };

  const handleShowSeventhsChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Show Sevenths change.');
    }
    const isChecked = event.target.checked;
    console.log(`App.jsx: handleShowSeventhsChange - Checked: ${isChecked}`);
    setShowSevenths(isChecked);
    // Reset inversion if switching from 7ths (where 3rd inv exists) to triads
    if (!isChecked && rhInversion === 3) {
      console.log("App.jsx: Resetting RH inversion from 3rd (7ths only).");
      setRhInversion(0);
    }
  };

  const handleSplitHandVoicingChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Split Hand Voicing (Diatonic) change.');
    }
    const isChecked = event.target.checked;
    console.log(`App.jsx: handleSplitHandVoicingChange - Checked: ${isChecked}`);
    setSplitHandVoicing(isChecked);
    // Maybe reset interval if split hand is turned off? Or keep last value?
    // if (!isChecked) setSplitHandInterval(24); // Example reset
  };

  const handleRhInversionChange = (newInversionValue) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to RH Inversion change.');
    }
     // Ensure value is treated as a number
     const inversionNum = parseInt(newInversionValue, 10);
     console.log(`App.jsx: handleRhInversionChange - New Inversion: ${inversionNum}`);
     // Add validation if needed (e.g., prevent 3rd inv if !showSevenths)
     if (!showSevenths && inversionNum === 3) {
        console.warn("App.jsx: Cannot select 3rd inversion for triads. Setting to Root Pos.");
        setRhInversion(0);
     } else {
        setRhInversion(inversionNum);
     }
  };

  const handleSplitHandIntervalChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Split Hand Interval change.');
    }
    // Ensure value is treated as a number
    const intervalNum = parseInt(event.target.value, 10);
    console.log(`App.jsx: handleSplitHandIntervalChange - New Interval: ${intervalNum}`);
    setSplitHandInterval(intervalNum);
  };

  // --- Drill Handlers ---
  const handleDrillOctavesChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Drill Octaves change.');
    }
    const numOctaves = parseInt(event.target.value, 10);
    console.log(`App.jsx: handleDrillOctavesChange - Num Octaves: ${numOctaves}`);
    setDrillNumOctaves(numOctaves);
  };

  const handleDrillRepetitionsChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Drill Repetitions change.');
    }
    const numRepetitions = parseInt(event.target.value, 10);
    console.log(`App.jsx: handleDrillRepetitionsChange - Repetitions: ${numRepetitions}`);
    setDrillRepetitions(numRepetitions);
  };

  const handleDrillStyleChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Drill Style change.');
    }
    const newStyle = event.target.value;
    console.log(`App.jsx: handleDrillStyleChange - Style: ${newStyle}`);
    setDrillStyle(newStyle);
  };

  const handleDrillToggle = () => {
    const nextDrillState = !isDrillActive;
    console.log(`App.jsx: handleDrillToggle - Setting drill active: ${nextDrillState}`);
    
    // --- Re-add setting drillOptions when STARTING the drill ---
    if (nextDrillState) {
        setDrillOptions({
            octaves: drillNumOctaves, // Use the state variable
            repetitions: drillRepetitions, // Use the state variable
            style: drillStyle // Use the state variable
        });
        console.log(`App.jsx: handleDrillToggle - Set drillOptions to:`, { octaves: drillNumOctaves, repetitions: drillRepetitions, style: drillStyle });
    } else {
        // Optionally clear options when stopping? Or leave them?
        // setDrillOptions({}); // Keep options for potential restart?
    }
    // --- End re-added logic ---

    setIsDrillActive(nextDrillState);
    // If starting drill, reset score? (Drill hook resets internally now)
    // if (nextDrillState) {
    //   setDrillScore({ correctNotes: 0, incorrectNotes: 0 }); 
    // }
  };

  // --- Progression Mode Handlers ---
  const handleProgressionChange = (newProgressionId) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Progression change.');
    }
    console.log(`App.jsx: handleProgressionChange - Selected Progression ID: ${newProgressionId}`);
    setSelectedProgressionId(newProgressionId);
  };

  // --- Voicing Handlers ---
  const handleVoicingSplitHandChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Voicing Split Hand change.');
    }
    const isChecked = event.target.checked;
    console.log(`App.jsx: handleVoicingSplitHandChange - Checked: ${isChecked}`);
    setVoicingSplitHand(isChecked);
    // Optionally reset LH offset if split hand is turned off
    // if (!isChecked) setVoicingLhOctaveOffset(-12); 
  };

  const handleVoicingLhOffsetChange = (newValue) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Voicing LH Offset change.');
    }
    const offsetNum = parseInt(newValue, 10);
    console.log(`App.jsx: handleVoicingLhOffsetChange - Offset: ${offsetNum}`);
    setVoicingLhOctaveOffset(offsetNum);
  };

  const handleVoicingRhRootlessChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Voicing RH Rootless change.');
    }
    const isChecked = event.target.checked;
    console.log(`App.jsx: handleVoicingRhRootlessChange - Checked: ${isChecked}`);
    setVoicingRhRootless(isChecked);
  };
  const handleVoicingUseShellChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Voicing Use Shell change.');
    }
    const isChecked = event.target.checked;
    console.log(`App.jsx: handleVoicingUseShellChange - Checked: ${isChecked}`);
    setVoicingUseShell(isChecked);
  };
  const handleVoicingAddOctaveRootChange = (event) => {
    if (isDrillActive) {
        setIsDrillActive(false);
        console.log('Drill stopped due to Voicing Add Octave Root change.');
    }
    const isChecked = event.target.checked;
    console.log(`App.jsx: handleVoicingAddOctaveRootChange - Checked: ${isChecked}`);
    setVoicingAddOctaveRoot(isChecked);
  };

  // --- MIDI Backing Track Genre Handler ---
  const handleMidiGenreChange = (newGenre) => {
      console.log(`App.jsx: handleMidiGenreChange - New Genre: ${newGenre}`);
      setSelectedMidiGenre(newGenre);
      // When genre changes, maybe stop the current track and clear selection?
      // stopMidiFile(); // Assuming stopMidiFile is available from useMidiPlayer
      // Or perhaps just let the Controls component handle filtering
  };

  // *** ADD BACK: Calculate selectedChordInfo for Chord Search mode ***
  const selectedChordInfo = useMemo(() => {
    if (currentMode === 'chord_search' && selectedChordType) {
      try {
        // Construct the chord name with octave for TonalJS
        const chordNameWithOctave = `${selectedRootNote}${selectedOctave}${selectedChordType}`;
        const info = Chord.get(chordNameWithOctave); // Use Chord.get for full info
        // console.log(`App.jsx - Calculated chordInfo for ${chordNameWithOctave}:`, info); // Optional log
        return info;
      } catch (e) {
        console.error(`Error getting chord info for ${selectedChordType} at ${selectedRootNote}${selectedOctave}:`, e);
        return Chord.get(''); // Return empty chord on error
      }
    } 
    return Chord.get(''); // Return empty chord if not in chord_search mode
  }, [currentMode, selectedChordType, selectedRootNote, selectedOctave]);

  // console.log('App.jsx - ROOT_NOTES:', ROOT_NOTES);
  // console.log('App.jsx - Notes to Highlight:', notesToHighlight);

  // *** Find the full selected progression object FOR InfoDisplay ***
  const selectedProgressionDetails = useMemo(() => {
      return availableProgressions.find(p => p.id === selectedProgressionId);
  }, [selectedProgressionId, availableProgressions]);

  // *** Log the new state variable ***
  console.log('[App.jsx] Value of isMidiReady state before return:', isMidiReady);

    // *** Log the state arrays ***
    console.log('[App.jsx] Available midiInputs state before return:', availableMidiInputs);
    console.log('[App.jsx] Available midiOutputs state before return:', availableMidiOutputs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <h1>Piano Helper (React Version)</h1>
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Column (Keyboard & Info) */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '60%', paddingRight: '10px' }}>
          <div style={{ border: '1px solid green', padding: '10px', marginBottom: '10px', flexShrink: 0 }}>
            <PianoKeyboard 
              octaveCount={5} 
              startOctave={2}
              notesToHighlight={notesToHighlight} 
              playedNotes={activeNotesArray} // Use the array version
              expectedNotes={drillStepData?.expectedMidiNotes || []} 
            />
          </div>
          <div style={{ border: '1px solid orange', padding: '10px', flexShrink: 0 }}>
             <InfoDisplay 
                mode={currentMode}
                scaleInfo={scaleInfo} 
                chordInfo={selectedChordInfo} // *** Pass the newly calculated value ***
                selectedDiatonicDegree={selectedDiatonicDegree} 
                diatonicChords={showSevenths ? diatonicSevenths : diatonicTriads} 
                rootNote={selectedRootNote} // Pass rootNote
                calculatedDiatonicChordNotes={calculatedDiatonicChordNotes} // Pass calculated notes
                selectedProgressionDetails={selectedProgressionDetails} // *** Pass the newly calculated value ***
                calculatedProgressionChords={calculatedProgressionChords} // Pass voiced progression chords
             />
          </div>
        </div>

        {/* Right Column (Controls & Monitor) */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '40%', overflowY: 'auto' }}>
           <Controls
              // Mode
              modes={MODES}
              currentMode={currentMode}
              onModeChange={handleModeChange}

              // Root/Scale/Chord Props
              rootNotes={ROOT_NOTES}
              octaves={OCTAVES}
              scaleTypes={SCALE_TYPES}
              chordTypes={CHORD_TYPES}
              selectedRootNote={selectedRootNote}
              selectedOctave={selectedOctave}
              selectedScaleType={selectedScaleType}
              selectedChordType={selectedChordType}
              onRootChange={handleRootChange}
              onOctaveChange={handleOctaveChange}
              onScaleChange={handleScaleChange}
              onChordChange={handleChordChange}

              // Diatonic Chord Mode Props
              diatonicTriads={diatonicTriads}
              diatonicSevenths={diatonicSevenths}
              selectedDiatonicDegree={selectedDiatonicDegree}
              showSevenths={showSevenths}
              splitHandVoicing={splitHandVoicing} // Diatonic-specific split hand flag
              rhInversion={rhInversion}
              inversions={INVERSIONS.map(inv => ({ // Filter inversions based on 7ths for display
                  ...inv, 
                  disabled: inv.value === 3 && !showSevenths 
              }))}
              onDiatonicDegreeChange={handleDiatonicDegreeChange}
              onShowSeventhsChange={handleShowSeventhsChange}
              onSplitHandVoicingChange={handleSplitHandVoicingChange} // Diatonic handler
              onRhInversionChange={handleRhInversionChange}
              splitHandInterval={splitHandInterval}
              onSplitHandIntervalChange={handleSplitHandIntervalChange}
              
              // MIDI Props
              midiInputs={availableMidiInputs} // Pass state variable
              midiOutputs={availableMidiOutputs} // Pass state variable
              selectedInputId={selectedInputId}
              selectedOutputId={selectedOutputId}
              onSelectInput={selectInput}   // *** Pass correct function ***
              onSelectOutput={selectOutput}  // *** Pass correct function ***
              // *** Pass the memoized value ***
              isMidiInitialized={isMidiReady}
              
              // Metronome Props
              isMetronomePlaying={isMetronomePlaying}
              metronomeBpm={metronomeBpm}
              metronomeSoundNote={metronomeSoundNote} // Pass the selected note value
              metronomeSounds={metronomeSoundsArray} // *** PASS THE ARRAY ***
              metronomeTimeSignature={metronomeTimeSignature}
              onToggleMetronome={toggleMetronome}
              onChangeMetronomeTempo={changeMetronomeTempo}
              onChangeMetronomeSound={changeMetronomeSound} // Handler expects the note value
              onChangeMetronomeTimeSignature={changeMetronomeTimeSignature}
              
              // MIDI Player Props
              playbackState={playbackState}
              loadedMidiFileName={loadedMidiFileName} // *** Should now be defined ***
              availableMidiFiles={ALL_MIDI_FILES} // Pass all files
              onLoadMidiFile={loadMidiFile}
              onPlayMidiFile={playMidiFile}
              onPauseMidiFile={pauseMidiFile}
              onStopMidiFile={stopMidiFile}
              // MIDI Genre Props
              midiGenres={MIDI_GENRES} // Pass available genres
              selectedMidiGenre={selectedMidiGenre}
              onMidiGenreChange={handleMidiGenreChange} // Pass handler

              // Chord Progression Props
              availableProgressions={availableProgressions}
              selectedProgressionId={selectedProgressionId}
              onProgressionChange={handleProgressionChange}

              // Voicing Props (Passed for Chord Progression display)
              voicingSplitHand={voicingSplitHand} // Use shared state
              voicingLhOctaveOffset={voicingLhOctaveOffset}
              voicingRhRootless={voicingRhRootless}
              onVoicingSplitHandChange={handleVoicingSplitHandChange} // Use shared handler
              onVoicingLhOffsetChange={handleVoicingLhOffsetChange}
              onVoicingRhRootlessChange={handleVoicingRhRootlessChange}
              voicingUseShell={voicingUseShell} 
              voicingAddOctaveRoot={voicingAddOctaveRoot}
              onVoicingUseShellChange={handleVoicingUseShellChange}
              onVoicingAddOctaveRootChange={handleVoicingAddOctaveRootChange}

              // Essential props
              log={() => {}} // Placeholder if Controls no longer needs direct logging
              sendMessage={sendMessage} // Pass sendMessage for GM2 sounds etc.
           />
           <DrillControls 
              style={{ flex: 1 }} // DrillControls takes 1 part
              currentMode={currentMode} // Pass mode for style disabling
              isDrillActive={isDrillActive}
              setIsDrillActive={handleDrillToggle} // Use the toggle handler
              drillNumOctaves={drillNumOctaves}
              drillRepetitions={drillRepetitions}
              drillStyle={drillStyle}
              onDrillOctavesChange={handleDrillOctavesChange}
              onDrillRepetitionsChange={handleDrillRepetitionsChange}
              onDrillStyleChange={handleDrillStyleChange}
              currentDrillStep={drillStepData}
              drillScore={currentDrillScore}
           />
        </div>
      </div>
      <MidiMonitorDisplay
        logMessages={logMessages}
      />
    </div>
  );
}

export default App; 