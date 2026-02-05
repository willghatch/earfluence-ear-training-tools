const intervalLabels = [
  "p1",
  "m2",
  "M2",
  "m3",
  "M3",
  "P4",
  "A4",
  "P5",
  "m6",
  "M6",
  "m7",
  "M7",
  "P8",
  "O+m2",
  "O+M2",
  "O+m3",
  "O+M3",
  "O+P4",
  "O+A4",
  "O+P5",
  "O+m6",
  "O+M6",
  "O+m7",
  "O+M7",
  "O+P8",
];

const inputSchema = {
  title: "Chord Match Configuration",
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
      title: "Chord Configurations",
      cssClass: "config-section",
      controls: [
        {
          type: "preset-selector",
          targetField: "chords",
          presetSource: "chordPresets",
        },
        {
          type: "dynamicList",
          id: "chords",
          itemType: {
            type: "struct",
            cssClass: "chord-config",
            fields: [
              {
                type: "text",
                id: "name",
                label: "Name:",
                default: "",
              },
              {
                type: "json",
                id: "offsets",
                label: "Offsets:",
                default: [0],
              },
              {
                type: "label",
                text: "Weights for bass note:",
              },
              {
                type: "fixedList",
                id: "weights",
                itemType: {
                  type: "number",
                  min: 0,
                },
                labels: [
                  "do",
                  "ra",
                  "re",
                  "me",
                  "mi",
                  "fa",
                  "fi",
                  "so",
                  "le",
                  "la",
                  "te",
                  "ti",
                ],
                default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                cssClass: "weights-grid",
              },
              {
                type: "checkbox",
                id: "overrideInversionWeight",
                label: "Override Inversion Weights:",
                default: false,
              },
              {
                type: "dynamicList",
                id: "inversionWeights",
                itemType: {
                  type: "number",
                  min: 0,
                },
                labelFunction: "getInversionLabel",
                default: [10],
                minLength: 1,
                removeType: "onlyLast",
                cssClass: "interval-grid",
              },
            ],
          },
          addButtonLabel: "+ Add Chord",
          default: [
            {
              name: "Major",
              offsets: [0, 4, 7],
              weights: [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0],
            },
            {
              name: "minor",
              offsets: [0, 3, 7],
              weights: [0, 0, 10, 0, 10, 0, 0, 0, 0, 10, 0, 0],
            },
            {
              name: "diminished",
              offsets: [0, 3, 6],
              weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10],
            },
          ],
        },
        {
          type: "label",
          text: "Global Inversion Weights (index 0 = root position, index 1 = 1st inversion, etc.):",
        },
        {
          type: "dynamicList",
          id: "globalInversionWeights",
          itemType: {
            type: "number",
            min: 0,
          },
          labelFunction: "getInversionLabel",
          default: [10],
          minLength: 1,
          removeType: "onlyLast",
          cssClass: "interval-grid",
        },
      ],
    },
    {
      title: "Interval Weights",
      cssClass: "config-section",
      controls: [
        {
          type: "preset-selector",
          targetField: "intervalWeights",
          presetSource: "intervalPresets",
        },
        {
          type: "dynamicList",
          id: "intervalWeights",
          itemType: {
            type: "number",
            min: 0,
          },
          labelFunction: "getIntervalLabel",
          default: [10, 20, 20, 20, 10, 10, 7, 7, 5, 4, 3, 2, 1, 1],
          minLength: 1,
          removeType: "onlyLast",
          cssClass: "interval-grid",
        },
      ],
    },
    {
      title: "Playback Settings",
      cssClass: "config-section",
      controls: [
        {
          type: "checkbox",
          id: "tightVoicing",
          label: "Tight Voicing:",
          default: true,
        },
        {
          type: "checkbox",
          id: "arpeggiate",
          label: "Arpeggiate Chords",
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
          id: "noteDuration",
          label: "Note Duration (beats):",
          min: 0.1,
          step: 0.5,
          default: 1,
        },
        {
          type: "int",
          id: "sequenceLength",
          label: "Sequence Length:",
          min: 1,
          default: 1,
        },
        {
          type: "number",
          id: "extraRests",
          label: "Extra Rests (beats):",
          default: 0,
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
          id: "lowPitch",
          label: "Low Pitch (MIDI):",
          min: 0,
          max: 127,
          default: 50,
        },
        {
          type: "int",
          id: "highPitch",
          label: "High Pitch (MIDI):",
          min: 0,
          max: 127,
          default: 75,
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
          id: "tempo",
          label: "Tempo (BPM):",
          min: 1,
          default: 80,
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
  presets: {
    chordPresets: {
      "no change": [],
      "Major Scale Triads": [
        {
          name: "Major",
          offsets: [0, 4, 7],
          weights: [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0],
        },
        {
          name: "minor",
          offsets: [0, 3, 7],
          weights: [0, 0, 10, 0, 10, 0, 0, 0, 0, 10, 0, 0],
        },
        {
          name: "diminished",
          offsets: [0, 3, 6],
          weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10],
        },
      ],
      "minor Scale Triads": [
        {
          name: "Major",
          offsets: [0, 4, 7],
          weights: [0, 0, 0, 10, 0, 0, 0, 0, 10, 0, 10, 0],
        },
        {
          name: "minor",
          offsets: [0, 3, 7],
          weights: [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0],
        },
        {
          name: "diminished",
          offsets: [0, 3, 6],
          weights: [0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
      "minor + harmonic triads": [
        {
          name: "Major",
          offsets: [0, 4, 7],
          weights: [0, 0, 0, 10, 0, 0, 0, 10, 10, 0, 10, 0],
        },
        {
          name: "minor",
          offsets: [0, 3, 7],
          weights: [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0],
        },
        {
          name: "diminished",
          offsets: [0, 3, 6],
          weights: [0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
        },
      ],
      "major + mixolydian triads": [
        {
          name: "Major",
          offsets: [0, 4, 7],
          weights: [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 10, 0],
        },
        {
          name: "minor",
          offsets: [0, 3, 7],
          weights: [0, 0, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0],
        },
        {
          name: "diminished",
          offsets: [0, 3, 6],
          weights: [0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 10],
        },
      ],
    },
    intervalPresets: {
      "no change": [],
      default: [10, 20, 20, 20, 10, 10, 7, 7, 5, 4, 3, 2, 1, 1],
      stepwise: [400, 1000, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "small jumps": [300, 500, 500, 400, 400, 100, 100, 1, 1, 0, 0, 0, 0],
      "more jumps": [
        300, 500, 500, 400, 400, 300, 300, 200, 200, 100, 100, 100, 0, 0,
      ],
      "even more jumps": [
        100, 300, 300, 300, 300, 300, 300, 200, 200, 200, 200, 200, 100, 100,
      ],
    },
  },
};

let formAPI;

function getIntervalLabel(index) {
  return intervalLabels[index]
    ? `${intervalLabels[index]} (${index} st)`
    : `(${index} st)`;
}

function getInversionLabel(index) {
  if (index === 0) return "root position";
  if (index === 1) return "1st inversion";
  if (index === 2) return "2nd inversion";
  return `inversion ${index}`;
}

function randomTonic() {
  const config = formAPI.getCurrentConfig();
  formAPI.setConfig({ ...config, tonic: getRandomPitchInRange(config) });
}

// Initialize the config editor
function initializeConfigEditor() {
  formAPI = inputCreate(inputSchema, "#config-container", {
    functions: {
      noteName: noteName,
      randomTonic: randomTonic,
      getIntervalLabel: getIntervalLabel,
      getInversionLabel: getInversionLabel,
    },
    autoSaveKey: "chord-match",
    initialLoadFromAutoSave: true,
  });
}

// Export API for external use
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

// Make functions globally accessible
window.initializeConfigEditor = initializeConfigEditor;
window.getCurrentConfig = getCurrentConfig;
window.setCurrentConfig = setCurrentConfig;
window.resetConfig = resetConfig;

function produceChordWeights(config) {
  // Make weight array of chords, [{weightEnd, choice: [solfegeOffset, chord]}].
  let weights = [];
  let weightTotal = 0;
  for (const chord of config.chords) {
    for (let i = 0; i < 12; i++) {
      const weight = chord.weights[i];
      if (weight == 0) {
        continue;
      }
      weightTotal += weight;
      weights.push({
        choice: [i, chord],
        weightEnd: weightTotal,
      });
    }
  }
  // TODO - handle case with no chords.
  return weights;
}

function makeChordChoice(config) {
  const weights = produceChordWeights(config);
  const choice = makeWeightedChoice(weights);
  return chooseAndRootChord(choice, config);
}

function chooseAndRootChord(choice, config) {
  const [solfegeOffset, chord] = choice;
  let minOffset = Math.min(...chord.offsets);
  let maxOffset = Math.max(...chord.offsets);
  let initialRoot = config.tonic + solfegeOffset;
  if (initialRoot > config.highPitch) {
    initialRoot = initialRoot - 12;
  }
  const rootOptions = [];
  for (let root = initialRoot; root > config.lowPitch; root -= 12) {
    if (
      root - minOffset >= config.lowPitch &&
      root + maxOffset <= config.highPitch
    ) {
      rootOptions.push(root);
    }
  }
  for (let root = initialRoot + 12; root < config.highPitch; root += 12) {
    if (
      root - minOffset >= config.lowPitch &&
      root + maxOffset <= config.highPitch
    ) {
      rootOptions.push(root);
    }
  }
  if (rootOptions.length == 0) {
    rootOptions.push(initialRoot);
  }
  const finalRoot = rootOptions[getRandomInt(rootOptions.length)];
  return chord.offsets.map((offset) => finalRoot + offset);
}

function applyInversion(chordNotes, chord, config, previousChordRoot) {
  const invWeights =
    chord.overrideInversionWeight &&
    chord.inversionWeights &&
    chord.inversionWeights.length > 0
      ? chord.inversionWeights
      : config.globalInversionWeights || [10];

  if (invWeights.length <= 1) {
    return chordNotes;
  }

  const inversionIndex = weightedRandomIndex(invWeights);

  if (inversionIndex === 0) {
    return chordNotes;
  }

  // Apply inversions: each inversion rotates the lowest note to the end, raised by an octave
  let notes = [...chordNotes];
  for (let i = 0; i < inversionIndex; i++) {
    const minNote = Math.min(...notes);
    const minIdx = notes.indexOf(minNote);
    notes.splice(minIdx, 1);
    notes.push(minNote + 12);
  }

  // Find new lowest note (the inverted bass)
  const newLowest = Math.min(...notes);
  const intervals = notes.map((n) => n - newLowest);

  // Use interval weights to choose octave for the inverted chord
  const intervalWeights = config.intervalWeights || [
    10, 20, 20, 20, 10, 10, 7, 7, 5, 4, 3, 2, 1, 1,
  ];

  // Find valid octave candidates for the inverted bass
  const candidates = [];
  for (let base = newLowest - 60; base <= newLowest + 60; base += 12) {
    const candidateNotes = intervals.map((offset) => base + offset);
    const minNote = Math.min(...candidateNotes);
    const maxNote = Math.max(...candidateNotes);
    if (minNote >= config.lowPitch && maxNote <= config.highPitch) {
      let weight = 1;
      if (previousChordRoot !== null && previousChordRoot !== undefined) {
        const distance = Math.abs(base - previousChordRoot);
        weight =
          distance < intervalWeights.length ? intervalWeights[distance] : 0;
      }
      if (weight > 0) {
        candidates.push({ notes: candidateNotes, weight });
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback: use inverted chord as computed
    return notes;
  }

  // Weighted random selection among valid candidates
  const weightsArray = [];
  let totalWeight = 0;
  for (const c of candidates) {
    totalWeight += c.weight;
    weightsArray.push({ choice: c.notes, weightEnd: totalWeight });
  }
  return makeWeightedChoice(weightsArray);
}

function applyChordPreset() {
  const selectedPreset = document.getElementById("chordPreset").value;
  const currentConfig = getCurrentConfig();
  const presetChords = currentConfig.chordPresets[selectedPreset];

  if (presetChords && presetChords.length > 0) {
    const chordsContainer = document.getElementById("chordsContainer");
    chordsContainer.innerHTML = "";
    presetChords.forEach((chord) => {
      chordsContainer.appendChild(createChordConfigDiv(chord));
    });
  }
}

function saveChordPreset() {
  const presetName = document
    .getElementById("chordSavePresetName")
    .value.trim();
  if (!presetName) {
    alert("Please enter a preset name");
    return;
  }

  const currentConfig = getCurrentConfig();
  const chordDivs = document.querySelectorAll(".chord-config");
  const chords = Array.from(chordDivs).map((div) => {
    return {
      name: div.querySelector(".chord-name").value,
      offsets: JSON.parse(div.querySelector(".chord-offsets").value),
      weights: Array.from(div.querySelectorAll(".chord-weight")).map((input) =>
        parseInt(input.value),
      ),
    };
  });

  currentConfig.chordPresets[presetName] = chords;

  addPresetToSelect("chordPreset", presetName);
  document.getElementById("chordSavePresetName").value = "";
}
