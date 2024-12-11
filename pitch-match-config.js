const defaultIntervalPreset = [10, 20, 20, 20, 10, 10, 7, 7, 5, 4, 3, 2, 1, 1];
const defaultSolfegePresets = {
  "no change": [],
  Major: [10, 0, 10, 0, 10, 10, 0, 10, 0, 10, 0, 10],
  "Major Pentatonic": [10, 0, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0],
  minor: [10, 0, 10, 10, 0, 10, 0, 10, 10, 0, 10, 0],
  "minor pentatonic": [10, 0, 0, 10, 0, 10, 0, 10, 0, 0, 10, 0],
  "harmonic minor": [10, 0, 10, 10, 0, 10, 0, 10, 10, 0, 0, 10],
  "minor + melodic 6/7": [10, 0, 10, 10, 0, 10, 0, 10, 10, 8, 10, 8],
  "hexatonic blues": [10, 0, 0, 10, 0, 10, 10, 10, 0, 0, 10, 0],
  "Major plus minor": [10, 0, 10, 10, 10, 10, 0, 10, 10, 10, 10, 10],
  "Major plus mods": [100, 20, 100, 20, 100, 100, 20, 100, 20, 100, 20, 100],
  "minor plus mods": [100, 20, 100, 100, 20, 100, 20, 100, 100, 60, 100, 90],
  chromatic: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  "only accidentals": [0, 100, 0, 100, 0, 0, 100, 0, 100, 0, 100, 0],
};

const defaultIntervalPresets = {
  "no change": [],
  default: defaultIntervalPreset,
  stepwise: [400, 1000, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "small jumps": [300, 500, 500, 400, 400, 100, 100, 1, 1, 0, 0, 0, 0],
  "more jumps": [
    300, 500, 500, 400, 400, 300, 300, 200, 200, 100, 100, 100, 0, 0,
  ],
  "even more jumps": [
    100, 300, 300, 300, 300, 300, 300, 200, 200, 200, 200, 200, 100, 100,
  ],
};

let solfegePresets = defaultSolfegePresets;
let intervalPresets = defaultIntervalPresets;

const exampleConfig = {
  lowPitch: 50,
  highPitch: 75,
  tempo: 80, // BPM
  tonic: 60, // Tonic as midi note number.
  solfegeWeights: [10, 0, 10, 0, 10, 10, 0, 10, 0, 10, 0, 10], // Weights for each of the 12 solfege do, ra, re, me, mi, etc.
  intervalWeights: defaultIntervalPreset, // Weights for each interval starting from unison, then m2, etc in semitone intervals.  The last configured interval is the greatest interval that will be considered.
  solfegePresets: solfegePresets,
  intervalPresets: intervalPresets,
};

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

// Initialize and update solfege weights section
function initializeSolfegeWeights() {
  const container = document.getElementById("solfegeWeights");
  solfegeLabels.forEach((name, index) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>${name}</label>
      <input type="number" class="solfege-weight" data-index="${index}" min="0" value="0" />
      `;
    container.appendChild(div);
  });
}

// Initialize and update interval weights section
function updateIntervalWeights(length) {
  const container = document.getElementById("intervalWeights");
  container.innerHTML = "";

  for (let i = 0; i < length; i++) {
    const div = document.createElement("div");
    const intervalName = i < intervalLabels.length ? intervalLabels[i] : "";
    const intervalSemitoneLabel = ` (${i} st)`;
    div.innerHTML = `
      <label>${intervalName}${intervalSemitoneLabel}</label>
      <input type="number" class="interval-weight" data-index="${i}" min="0" value="0" />
      `;
    container.appendChild(div);
  }
}

// Get current configuration from UI
function getCurrentConfig() {
  const config = {
    lowPitch: parseInt(document.getElementById("lowPitch").value),
    highPitch: parseInt(document.getElementById("highPitch").value),
    tempo: parseInt(document.getElementById("tempo").value),
    tonic: parseInt(document.getElementById("tonic").value),
    solfegeWeights: Array.from(
      document.querySelectorAll(".solfege-weight"),
    ).map((input) => parseInt(input.value)),
    intervalWeights: Array.from(
      document.querySelectorAll(".interval-weight"),
    ).map((input) => parseInt(input.value)),
  };
  config.solfegePresets = solfegePresets;
  config.intervalPresets = intervalPresets;
  return config;
}

// Set UI from configuration
function setConfig(config) {
  document.getElementById("lowPitch").value = config.lowPitch;
  document.getElementById("highPitch").value = config.highPitch;
  document.getElementById("tempo").value = config.tempo;
  document.getElementById("tonic").value = config.tonic;
  document.getElementById("tonicName").textContent = noteName(config.tonic);

  const solfegeInputs = document.querySelectorAll(".solfege-weight");
  config.solfegeWeights.forEach((weight, i) => {
    if (solfegeInputs[i]) solfegeInputs[i].value = weight;
  });

  updateIntervalWeights(config.intervalWeights.length);
  const intervalInputs = document.querySelectorAll(".interval-weight");
  config.intervalWeights.forEach((weight, i) => {
    if (intervalInputs[i]) intervalInputs[i].value = weight;
  });

  solfegePresets = config.solfegePresets;
  intervalPresets = config.intervalPresets;
  initializeSolfegePresets();
  initializeIntervalPresets();
}

function randomTonic() {
  const config = getCurrentConfig();
  setConfig({ ...config, tonic: getRandomPitchInRange(config) });
}

function exportConfig() {
  document.getElementById("configIO").value = JSON.stringify(
    getCurrentConfig(),
    null,
    2,
  );
}

function importConfig() {
  importConfigHelper(setConfig);
}

function resetConfig() {
  setConfig(exampleConfig);
}

function addInterval() {
  const currentConfig = getCurrentConfig();
  currentConfig.intervalWeights.push(0);
  setConfig(currentConfig);
}

function removeInterval() {
  const currentConfig = getCurrentConfig();
  if (currentConfig.intervalWeights.length > 1) {
    currentConfig.intervalWeights.pop();
    setConfig(currentConfig);
  }
}

function applySolfegePreset() {
  const selectedPreset = document.getElementById("solfegePreset").value;
  const currentConfig = getCurrentConfig();
  const weights = currentConfig.solfegePresets[selectedPreset];
  if (weights && weights.length == 12) {
    currentConfig.solfegeWeights = weights;
    setConfig(currentConfig);
  }
}

function applyIntervalPreset() {
  const selectedPreset = document.getElementById("intervalPreset").value;
  const currentConfig = getCurrentConfig();
  const weights = currentConfig.intervalPresets[selectedPreset];
  if (weights && weights.length > 0) {
    currentConfig.intervalWeights = [...weights];
    setConfig(currentConfig);
  }
}

function initializeConfigEditor() {
  initializeSolfegeWeights();
  setConfig(exampleConfig);

  initializeSolfegePresets();
  initializeIntervalPresets();

  setupTonicNameUpdate();
}

function initializeSolfegePresets() {
  initializePresetSelect("solfegePreset", getCurrentConfig().solfegePresets);
}

function initializeIntervalPresets() {
  initializePresetSelect("intervalPreset", getCurrentConfig().intervalPresets);
}

function saveSolfegePreset() {
  const presetName = document
    .getElementById("solfegeSavePresetName")
    .value.trim();
  if (!presetName) {
    alert("Please enter a preset name");
    return;
  }

  const currentConfig = getCurrentConfig();
  currentConfig.solfegePresets[presetName] = [...currentConfig.solfegeWeights];
  solfegePresets = currentConfig.solfegePresets;

  addPresetToSelect("solfegePreset", presetName);
  document.getElementById("solfegeSavePresetName").value = "";
}

function saveIntervalPreset() {
  const presetName = document
    .getElementById("intervalSavePresetName")
    .value.trim();
  if (!presetName) {
    alert("Please enter a preset name");
    return;
  }

  const currentConfig = getCurrentConfig();
  currentConfig.intervalPresets[presetName] = [
    ...currentConfig.intervalWeights,
  ];
  intervalPresets = currentConfig.intervalPresets;

  addPresetToSelect("intervalPreset", presetName);
  document.getElementById("intervalSavePresetName").value = "";
}
