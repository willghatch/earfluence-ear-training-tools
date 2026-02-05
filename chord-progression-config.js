const inputSchema = {
  title: "Chord Progression Configuration",
  sections: [
    {
      title: "Import/Export Configuration",
      cssClass: "config-section",
      controls: [
        {
          type: "import-export",
        },
      ],
    },
    {
      title: "Progression Settings",
      cssClass: "config-section",
      controls: [
        {
          type: "text",
          id: "progression",
          label: "Progression:",
          default: "I IV V I",
        },
        {
          type: "int",
          id: "tempo",
          label: "Tempo (BPM):",
          min: 1,
          default: 80,
        },
        {
          type: "int",
          id: "beatsPerChord",
          label: "Beats per Chord:",
          min: 1,
          default: 4,
        },
        {
          type: "number",
          id: "extraRests",
          label: "Extra Rests (beats):",
          default: 0,
        },
        {
          type: "checkbox",
          id: "tightVoicing",
          label: "Tight Voicing:",
          default: false,
        },
        {
          type: "checkbox",
          id: "arpeggiate",
          label: "Arpeggiate Chords:",
          default: false,
        },
        {
          type: "radio",
          id: "arpeggioDirection",
          label: "Arpeggio Direction:",
          options: [
            { value: "forward" },
            { value: "backward" },
            { value: "both" },
            { value: "random-mix" },
          ],
          default: "forward",
        },
        {
          type: "number",
          id: "arpeggiationSpeed",
          label: "Arpeggiation Speed (beats):",
          min: 0.05,
          step: 0.05,
          default: 0.1,
        },
        {
          type: "number",
          id: "legatoStaccato",
          label: "Legato/Staccato (0-1):",
          min: 0,
          max: 1,
          step: 0.05,
          default: 0.95,
        },
        {
          type: "int",
          id: "tonic",
          label: "Tonic (MIDI):",
          min: 0,
          max: 127,
          default: 60,
          displayFunction: "noteName",
          displayId: "tonicName",
          actions: [
            {
              label: "Random",
              functionName: "randomTonic",
            },
          ],
        },
        {
          type: "int",
          id: "lowPitch",
          label: "Low Pitch (MIDI):",
          min: 0,
          max: 127,
          default: 48,
        },
        {
          type: "int",
          id: "highPitch",
          label: "High Pitch (MIDI):",
          min: 0,
          max: 127,
          default: 84,
        },
        {
          type: "number",
          id: "volume",
          label: "Volume:",
          min: 0,
          max: 100,
          default: 80,
        },
        {
          type: "radio",
          id: "instrument",
          label: "Instrument:",
          options: [
            { value: "default" },
            { value: "sine" },
            { value: "square" },
            { value: "sawtooth" },
            { value: "triangle" },
          ],
          default: "default",
        },
      ],
    },
  ],
};

let formAPI;

function randomTonic() {
  const config = formAPI.getCurrentConfig();
  formAPI.setConfig({ ...config, tonic: getRandomPitchInRange(config) });
}

function initializeConfigEditor() {
  formAPI = inputCreate(inputSchema, "#config-container", {
    functions: {
      noteName: noteName,
      randomTonic: randomTonic,
    },
    autoSaveKey: "chord-progression",
    initialLoadFromAutoSave: true,
  });
}

function getCurrentConfig() {
  return formAPI ? formAPI.getCurrentConfig() : null;
}

function setCurrentConfig(config) {
  if (formAPI) {
    formAPI.setConfig(config);
  }
}

function resetConfig() {
  if (formAPI) {
    formAPI.resetConfig();
  }
}

window.initializeConfigEditor = initializeConfigEditor;
window.getCurrentConfig = getCurrentConfig;
window.setCurrentConfig = setCurrentConfig;
window.resetConfig = resetConfig;

// Roman numeral chord parsing
const majorRootOffsets = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };

function parseBassNote(str) {
  if (!str || str.trim() === "") return null;
  str = str.trim().toLowerCase();

  // Try solfege (longest match first: sol before so)
  const solfegeOptions = [
    ["sol", 7],
    ["do", 0],
    ["ra", 1],
    ["re", 2],
    ["me", 3],
    ["mi", 4],
    ["fa", 5],
    ["fi", 6],
    ["so", 7],
    ["le", 8],
    ["la", 9],
    ["te", 10],
    ["ti", 11],
    ["ri", 3],
    ["si", 11],
  ];
  for (const [syl, offset] of solfegeOptions) {
    if (str === syl) return offset;
  }

  // Try letter note: first char a-g, rest is empty or b or #
  const letterMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  if (letterMap[str[0]] !== undefined) {
    const rest = str.substring(1);
    if (rest === "" || rest === "b" || rest === "#") {
      let offset = letterMap[str[0]];
      if (rest === "b") offset -= 1;
      if (rest === "#") offset += 1;
      return (offset + 12) % 12;
    }
  }

  // Try scale degree number (optional b/# prefix, then digit 1-7)
  let accidental = 0;
  let numStr = str;
  if (str[0] === "b") {
    accidental = -1;
    numStr = str.substring(1);
  } else if (str[0] === "#") {
    accidental = 1;
    numStr = str.substring(1);
  }
  const num = parseInt(numStr);
  if (!isNaN(num) && num >= 1 && num <= 7 && String(num) === numStr) {
    return (majorRootOffsets[num] + accidental + 12) % 12;
  }

  return null;
}

function parseChordToken(token) {
  if (!token || token.trim() === "") return null;
  token = token.trim();

  // Split off slash bass note (e.g. "I/so", "V7/3")
  let bassNote = null;
  const slashIdx = token.indexOf("/");
  if (slashIdx !== -1) {
    bassNote = parseBassNote(token.substring(slashIdx + 1));
    if (bassNote === null) return null;
    token = token.substring(0, slashIdx);
  }

  let pos = 0;

  // Parse prefix (b or #)
  let accidental = 0;
  if (token[pos] === "b") {
    accidental = -1;
    pos++;
  } else if (token[pos] === "#") {
    accidental = 1;
    pos++;
  }

  // Parse roman numeral (longest match first, case-sensitive)
  const romanNumerals = [
    ["VII", 7],
    ["vii", 7],
    ["VI", 6],
    ["vi", 6],
    ["IV", 4],
    ["iv", 4],
    ["III", 3],
    ["iii", 3],
    ["II", 2],
    ["ii", 2],
    ["V", 5],
    ["v", 5],
    ["I", 1],
    ["i", 1],
  ];

  let numeral = null;
  let isUpper = null;
  let matchedLen = 0;
  for (const [rom, num] of romanNumerals) {
    if (token.substring(pos).startsWith(rom)) {
      numeral = num;
      isUpper = rom[0] === rom[0].toUpperCase();
      matchedLen = rom.length;
      break;
    }
  }

  if (numeral === null) return null;
  pos += matchedLen;

  // Parse suffix (case-sensitive)
  const suffix = token.substring(pos);
  const root = (majorRootOffsets[numeral] + accidental + 12) % 12;

  let offsets;
  switch (suffix) {
    case "":
      offsets = isUpper ? [0, 4, 7] : [0, 3, 7];
      break;
    case "7":
    case "D7":
      offsets = [0, 4, 7, 10];
      break;
    case "M7":
      offsets = [0, 4, 7, 11];
      break;
    case "m7":
      offsets = [0, 3, 7, 10];
      break;
    case "d7":
      offsets = [0, 3, 6, 9];
      break;
    case "hd7":
      offsets = [0, 3, 6, 10];
      break;
    default:
      return null;
  }

  return { root, offsets, bassNote };
}

function parseProgression(progressionStr) {
  const tokens = progressionStr.trim().split(/\s+/);
  const chords = [];
  for (const token of tokens) {
    const parsed = parseChordToken(token);
    if (parsed) {
      chords.push(parsed);
    }
  }
  return chords;
}

function weightedClosestChoice(options, reference) {
  // Choose among options with weighted random.  In each direction (up and
  // down) from reference, the closest option gets weight 100, the next gets
  // 50, then 25, etc. (halving, rounded down).
  if (options.length === 0) return null;
  if (reference === null || reference === undefined || options.length === 1) {
    return options[0];
  }
  // up: options >= reference, sorted ascending (closest first)
  const up = options.filter((o) => o >= reference).sort((a, b) => a - b);
  // down: options < reference, sorted descending (closest first)
  const down = options.filter((o) => o < reference).sort((a, b) => b - a);

  const weightChoices = [];
  let totalWeight = 0;
  for (let i = 0; i < up.length; i++) {
    const weight = Math.floor(100 / Math.pow(2, i));
    if (weight > 0) {
      totalWeight += weight;
      weightChoices.push({ choice: up[i], weightEnd: totalWeight });
    }
  }
  for (let i = 0; i < down.length; i++) {
    const weight = Math.floor(100 / Math.pow(2, i));
    if (weight > 0) {
      totalWeight += weight;
      weightChoices.push({ choice: down[i], weightEnd: totalWeight });
    }
  }
  return weightChoices.length > 0
    ? makeWeightedChoice(weightChoices)
    : options[0];
}

function rootChordInRange(rootOffset, offsets, config, previousRoot, bassNote) {
  if (bassNote !== undefined && bassNote !== null) {
    return slashChordInRange(
      rootOffset,
      offsets,
      config,
      previousRoot,
      bassNote,
    );
  }

  const baseRoot = config.tonic + rootOffset;
  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);

  const rootOptions = [];
  for (let root = baseRoot - 60; root <= baseRoot + 60; root += 12) {
    if (
      root + minOffset >= config.lowPitch &&
      root + maxOffset <= config.highPitch
    ) {
      rootOptions.push(root);
    }
  }

  if (rootOptions.length === 0) {
    return offsets.map((o) => baseRoot + o);
  }

  const bestRoot = weightedClosestChoice(rootOptions, previousRoot);
  return offsets.map((o) => bestRoot + o);
}

function slashChordInRange(
  rootOffset,
  offsets,
  config,
  previousRoot,
  bassNote,
) {
  const bassPc = (config.tonic + bassNote) % 12;

  // Find valid bass octaves where all chord tones fit above bass in range
  const validBassOctaves = [];
  const bassRef = config.tonic + bassNote;
  for (let bass = bassRef - 60; bass <= bassRef + 60; bass += 12) {
    if (bass < config.lowPitch) continue;
    let valid = true;
    for (const offset of offsets) {
      const pc = (config.tonic + rootOffset + offset) % 12;
      if (pc === bassPc) continue; // this chord tone is represented by the bass
      const diff = (((pc - (bass % 12)) % 12) + 12) % 12;
      const note = bass + (diff === 0 ? 12 : diff);
      if (note > config.highPitch) {
        valid = false;
        break;
      }
    }
    if (valid) {
      validBassOctaves.push(bass);
    }
  }

  if (validBassOctaves.length === 0) {
    // Fallback to regular chord placement
    return rootChordInRange(rootOffset, offsets, config, previousRoot);
  }

  const selectedBass = weightedClosestChoice(validBassOctaves, previousRoot);

  // Build notes: bass first, then chord tones placed in first octave above bass
  const notes = [selectedBass];
  for (const offset of offsets) {
    const pc = (config.tonic + rootOffset + offset) % 12;
    if (pc === bassPc) continue;
    const diff = (((pc - (selectedBass % 12)) % 12) + 12) % 12;
    notes.push(selectedBass + (diff === 0 ? 12 : diff));
  }
  return notes;
}
