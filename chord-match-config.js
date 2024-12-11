const defaultChordPresets = {
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
};

let chordPresets = defaultChordPresets;

const exampleConfig = {
  lowPitch: 50,
  highPitch: 75,
  tempo: 80, // BPM
  tonic: 60, // Tonic as midi note number.
  arpeggiate: false,
  arpeggioDirection: "forward",
  arpeggiationSpeed: 0.1,
  restBeats: 1,
  noteDuration: 1,
  chords: defaultChordPresets["Major Scale Triads"],
  chordPresets: defaultChordPresets,
};

// Get current configuration from UI
function getCurrentConfig() {
  const config = {
    lowPitch: parseInt(document.getElementById("lowPitch").value),
    highPitch: parseInt(document.getElementById("highPitch").value),
    tempo: parseInt(document.getElementById("tempo").value),
    tonic: parseInt(document.getElementById("tonic").value),
    chords: [],
    chordPresets: chordPresets,
    arpeggiate: document.getElementById("arpeggiate").checked,
    arpeggioDirection: document.querySelector(
      'input[name="arpeggioDirection"]:checked',
    ).value,
    arpeggiationSpeed: parseFloat(
      document.getElementById("arpeggiationSpeed").value,
    ),
    restBeats: parseFloat(document.getElementById("restBeats").value),
    noteDuration: parseFloat(document.getElementById("noteDuration").value),
  };

  const chordDivs = document.querySelectorAll(".chord-config");
  chordDivs.forEach((div) => {
    const chord = {
      name: div.querySelector(".chord-name").value,
      offsets: JSON.parse(div.querySelector(".chord-offsets").value),
      weights: Array.from(div.querySelectorAll(".chord-weight")).map((input) =>
        parseInt(input.value),
      ),
    };
    config.chords.push(chord);
  });

  return config;
}

// Set UI from configuration
function setConfig(config) {
  document.getElementById("lowPitch").value = config.lowPitch;
  document.getElementById("highPitch").value = config.highPitch;
  document.getElementById("tempo").value = config.tempo;
  document.getElementById("tonic").value = config.tonic;
  document.getElementById("tonicName").textContent = noteName(config.tonic);
  document.getElementById("arpeggiate").checked = config.arpeggiate;
  document.querySelector(
    `input[name="arpeggioDirection"][value="${config.arpeggioDirection}"]`,
  ).checked = true;
  document.getElementById("arpeggiationSpeed").value = config.arpeggiationSpeed;
  document.getElementById("restBeats").value = config.restBeats;
  document.getElementById("noteDuration").value = config.noteDuration;

  chordPresets = config.chordPresets;
  const chordsContainer = document.getElementById("chordsContainer");
  chordsContainer.innerHTML = "";
  config.chords.forEach((chord) => {
    chordsContainer.appendChild(createChordConfigDiv(chord));
  });
}

function randomTonic() {
  const config = getCurrentConfig();
  setConfig({ ...config, tonic: getRandomPitchInRange(config) });
}

function initializeConfigEditor() {
  document.getElementById("addChord").addEventListener("click", () => {
    const chordsContainer = document.getElementById("chordsContainer");
    chordsContainer.appendChild(createChordConfigDiv());
  });

  setupTonicNameUpdate();
  initializePresetSelect("chordPreset", getCurrentConfig().chordPresets);
  setConfig(exampleConfig);
}

function importConfig() {
  importConfigHelper(setConfig);
}

function exportConfig() {
  document.getElementById("configIO").value = JSON.stringify(
    getCurrentConfig(),
    null,
    2,
  );
}

function resetConfig() {
  setConfig(exampleConfig);
}

function createChordConfigDiv(
  chord = { name: "", offsets: [0], weights: Array(12).fill(0) },
) {
  const div = document.createElement("div");
  div.className = "chord-config";

  div.innerHTML = `
    <div class="chord-header">
      <div>
        <label>Name:</label>
        <input type="text" class="chord-name" value="${chord.name}">
      </div>
      <div>
        <label>Offsets:</label>
        <input type="text" class="chord-offsets" value="${JSON.stringify(chord.offsets)}">
      </div>
      <button class="remove-chord">Remove</button>
    </div>
    <div>Weights for bass note:</div>
    <div class="weights-grid">
      ${solfegeLabels
        .map(
          (label, i) => `
        <div class="weight-item">
          <label>${label}:</label>
          <input type="number" class="chord-weight" min="0" value="${chord.weights[i]}">
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  div
    .querySelector(".remove-chord")
    .addEventListener("click", () => div.remove());
  return div;
}

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
