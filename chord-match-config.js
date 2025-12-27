const inputSchema = {
  "title": "Chord Match Configuration",
  "sections": [
    {
      "title": "Import/Export Configuration",
      "cssClass": "config-section",
      "controls": [
        {
          "type": "import-export"
        }
      ]
    },
    {
      "title": "Chord Configurations",
      "cssClass": "config-section",
      "controls": [
        {
          "type": "preset-selector",
          "targetField": "chords",
          "presetSource": "chordPresets"
        },
        {
          "type": "dynamicList",
          "id": "chords",
          "itemType": {
            "type": "struct",
            "cssClass": "chord-config",
            "fields": [
              {
                "type": "text",
                "id": "name",
                "label": "Name:",
                "default": ""
              },
              {
                "type": "json",
                "id": "offsets",
                "label": "Offsets:",
                "default": [0]
              },
              {
                "type": "label",
                "text": "Weights for bass note:"
              },
              {
                "type": "fixedList",
                "id": "weights",
                "itemType": {
                  "type": "number",
                  "min": 0
                },
                "labels": ["do", "ra", "re", "me", "mi", "fa", "fi", "so", "le", "la", "te", "ti"],
                "default": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                "cssClass": "weights-grid"
              }
            ]
          },
          "addButtonLabel": "+ Add Chord",
          "default": [
            {
              "name": "Major",
              "offsets": [0, 4, 7],
              "weights": [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0]
            },
            {
              "name": "minor",
              "offsets": [0, 3, 7],
              "weights": [0, 0, 10, 0, 10, 0, 0, 0, 0, 10, 0, 0]
            },
            {
              "name": "diminished",
              "offsets": [0, 3, 6],
              "weights": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
            }
          ]
        }
      ]
    },
    {
      "title": "Playback Settings",
      "cssClass": "config-section",
      "controls": [
        {
          "type": "checkbox",
          "id": "arpeggiate",
          "label": "Arpeggiate Chords",
          "default": false
        },
        {
          "type": "radio",
          "id": "arpeggioDirection",
          "label": "Arpeggio Direction:",
          "options": [
            { "value": "forward", "label": "Forward" },
            { "value": "backward", "label": "Backward" },
            { "value": "both", "label": "Both" }
          ],
          "default": "forward"
        },
        {
          "type": "number",
          "id": "arpeggiationSpeed",
          "label": "Arpeggiation Speed (beats):",
          "min": 0.05,
          "step": 0.05,
          "default": 0.1
        },
        {
          "type": "number",
          "id": "noteDuration",
          "label": "Note Duration (beats):",
          "min": 0.1,
          "step": 0.5,
          "default": 1
        },
        {
          "type": "number",
          "id": "cycleBeats",
          "label": "Cycle Duration (beats):",
          "min": 0.1,
          "step": 0.5,
          "default": 2
        },
        {
          "type": "int",
          "id": "lowPitch",
          "label": "Low Pitch (MIDI):",
          "min": 0,
          "max": 127,
          "default": 50
        },
        {
          "type": "int",
          "id": "highPitch",
          "label": "High Pitch (MIDI):",
          "min": 0,
          "max": 127,
          "default": 75
        },
        {
          "type": "int",
          "id": "tonic",
          "label": "Tonic (MIDI):",
          "min": 0,
          "max": 127,
          "default": 60,
          "displayFunction": "noteName",
          "displayId": "tonicName",
          "actions": [
            {
              "label": "Random",
              "functionName": "randomTonic"
            }
          ]
        },
        {
          "type": "int",
          "id": "tempo",
          "label": "Tempo (BPM):",
          "min": 1,
          "default": 80
        }
      ]
    }
  ],
  "presets": {
    "chordPresets": {
      "no change": [],
      "Major Scale Triads": [
        {
          "name": "Major",
          "offsets": [0, 4, 7],
          "weights": [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0]
        },
        {
          "name": "minor",
          "offsets": [0, 3, 7],
          "weights": [0, 0, 10, 0, 10, 0, 0, 0, 0, 10, 0, 0]
        },
        {
          "name": "diminished",
          "offsets": [0, 3, 6],
          "weights": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
        }
      ],
      "minor Scale Triads": [
        {
          "name": "Major",
          "offsets": [0, 4, 7],
          "weights": [0, 0, 0, 10, 0, 0, 0, 0, 10, 0, 10, 0]
        },
        {
          "name": "minor",
          "offsets": [0, 3, 7],
          "weights": [10, 0, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0]
        },
        {
          "name": "diminished",
          "offsets": [0, 3, 6],
          "weights": [0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      ]
    }
  }
};

let formAPI;

function randomTonic() {
  const config = formAPI.getCurrentConfig();
  formAPI.setConfig({ ...config, tonic: getRandomPitchInRange(config) });
}

// Initialize the config editor
function initializeConfigEditor() {
  formAPI = inputCreate(inputSchema, '#config-container', {
    functions: {
      noteName: noteName,
      randomTonic: randomTonic
    }
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
