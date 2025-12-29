// Interval labels for display
const intervalLabels = [
  "p1", "m2", "M2", "m3", "M3", "P4", "A4", "P5", "m6", "M6", "m7", "M7", "P8",
  "O+m2", "O+M2", "O+m3", "O+M3", "O+P4", "O+A4", "O+P5", "O+m6", "O+M6", "O+m7", "O+M7", "O+P8",
];

const inputSchema = {
  "title": "Pitch Match Configuration",
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
      "title": "Solfege Weights",
      "cssClass": "config-section",
      "controls": [
        {
          "type": "preset-selector",
          "targetField": "solfegeWeights",
          "presetSource": "solfegePresets"
        },
        {
          "type": "fixedList",
          "id": "solfegeWeights",
          "itemType": {
            "type": "number",
            "min": 0
          },
          "labels": ["do", "ra", "re", "me", "mi", "fa", "fi", "so", "le", "la", "te", "ti"],
          "default": [10, 0, 10, 0, 10, 10, 0, 10, 0, 10, 0, 10],
          "cssClass": "solfege-grid"
        }
      ]
    },
    {
      "title": "Interval Weights",
      "cssClass": "config-section",
      "controls": [
        {
          "type": "preset-selector",
          "targetField": "intervalWeights",
          "presetSource": "intervalPresets"
        },
        {
          "type": "dynamicList",
          "id": "intervalWeights",
          "itemType": {
            "type": "number",
            "min": 0
          },
          "labelFunction": "getIntervalLabel",
          "default": [10, 20, 20, 20, 10, 10, 7, 7, 5, 4, 3, 2, 1, 1],
          "minLength": 1,
          "removeType": "onlyLast",
          "cssClass": "interval-grid"
        }
      ]
    },
    {
      "title": "Basic Settings",
      "cssClass": "config-section",
      "controls": [
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
          "min": 20,
          "max": 300,
          "default": 80
        },
        {
          "type": "int",
          "id": "sequenceLength",
          "label": "Sequence Length:",
          "min": 1,
          "default": 1
        },
        {
          "type": "number",
          "id": "extraRests",
          "label": "Extra Rests (beats):",
          "default": 1
        }
      ]
    }
  ],
  "presets": {
    "solfegePresets": {
      "no change": [],
      "Major": [10, 0, 10, 0, 10, 10, 0, 10, 0, 10, 0, 10],
      "Major Pentatonic": [10, 0, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0],
      "minor": [10, 0, 10, 10, 0, 10, 0, 10, 10, 0, 10, 0],
      "minor pentatonic": [10, 0, 0, 10, 0, 10, 0, 10, 0, 0, 10, 0],
      "harmonic minor": [10, 0, 10, 10, 0, 10, 0, 10, 10, 0, 0, 10],
      "minor + melodic 6/7": [10, 0, 10, 10, 0, 10, 0, 10, 10, 8, 10, 8],
      "hexatonic blues": [10, 0, 0, 10, 0, 10, 10, 10, 0, 0, 10, 0],
      "Major plus minor": [10, 0, 10, 10, 10, 10, 0, 10, 10, 10, 10, 10],
      "Major plus mods": [100, 20, 100, 20, 100, 100, 20, 100, 20, 100, 20, 100],
      "minor plus mods": [100, 20, 100, 100, 20, 100, 20, 100, 100, 60, 100, 90],
      "chromatic": [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
      "only accidentals": [0, 100, 0, 100, 0, 0, 100, 0, 100, 0, 100, 0]
    },
    "intervalPresets": {
      "no change": [],
      "default": [10, 20, 20, 20, 10, 10, 7, 7, 5, 4, 3, 2, 1, 1],
      "stepwise": [400, 1000, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "small jumps": [300, 500, 500, 400, 400, 100, 100, 1, 1, 0, 0, 0, 0],
      "more jumps": [300, 500, 500, 400, 400, 300, 300, 200, 200, 100, 100, 100, 0, 0],
      "even more jumps": [100, 300, 300, 300, 300, 300, 300, 200, 200, 200, 200, 200, 100, 100]
    }
  }
};

let formAPI;

function getIntervalLabel(index) {
  return intervalLabels[index] ? `${intervalLabels[index]} (${index} st)` : `(${index} st)`;
}

function randomTonic() {
  const config = formAPI.getCurrentConfig();
  formAPI.setConfig({ ...config, tonic: getRandomPitchInRange(config) });
}

// Initialize the config editor
function initializeConfigEditor() {
  formAPI = inputCreate(inputSchema, '#config-container', {
    functions: {
      noteName: noteName,
      randomTonic: randomTonic,
      getIntervalLabel: getIntervalLabel
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
