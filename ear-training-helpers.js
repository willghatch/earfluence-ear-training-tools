///////////////////////////////////////////////////////////////////////////////
//// Helpers useful for multiple ear training tools.
////////////////////////////////////////////////////////////////////////////////

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const solfegeLabels = [
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
];

const noteNames = [
  "C",
  "C♯/D♭",
  "D",
  "D♯/E♭",
  "E",
  "F",
  "F♯/G♭",
  "G",
  "G♯/A♭",
  "A",
  "A♯/B♭",
  "B",
];
function noteName(midiNum) {
  return noteNames[midiNum % 12];
}

function makeWeightedChoice(weightsArray) {
  // Make a choice for a choice array of [{weightEnd, choice}].
  const roll = getRandomInt(weightsArray[weightsArray.length - 1].weightEnd);
  // Do binary search to find the greatest index into the weightsArray that has
  // a weightEnd greater than roll.
  let low = 0;
  let high = weightsArray.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (weightsArray[mid].weightEnd <= roll) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return weightsArray[low].choice;
}

function produceMidiNoteWeights(lastChoice, config) {
  // Make weight array of midi notes, [{endWeight, choice: noteNumber}].
  let weights = [];
  let weightTotal = 0;
  for (let i = config.lowPitch; i <= config.highPitch; i++) {
    const tonic = config.tonic % 12;
    const solfegeWeight = config.solfegeWeights[(i + 12 - tonic) % 12];
    let intervalWeight = 1;
    if (lastChoice) {
      const interval = Math.abs(lastChoice - i);
      intervalWeight = config.intervalWeights[interval] || 0;
    } else {
      intervalWeight = 1;
    }
    const weight = solfegeWeight * intervalWeight;
    if (weight == 0) {
      continue;
    }
    weightTotal += weight;
    weights.push({
      choice: i,
      weightEnd: weightTotal,
      // Note that choiceWeight is just for debugging.
      //choiceWeight: weight,
    });
  }
  if (weights.length == 0) {
    return [{ choice: config.tonic, weightEnd: 1 }];
  }
  return weights;
}

const debugSweepMode = false;
function makeChoice(lastChoice, config) {
  if (debugSweepMode) {
    if (!lastChoice) {
      return config.lowPitch;
    } else if (lastChoice >= config.highPitch) {
      return config.lowPitch;
    } else {
      return lastChoice + 1;
    }
  }
  const weights = produceMidiNoteWeights(lastChoice, config);
  return makeWeightedChoice(weights);
}

function bpmSeconds(bpm) {
  const bps = bpm / 60;
  const hz = 1 / bps;
  return hz;
}
function bpmMilliseconds(bpm) {
  return bpmSeconds(bpm) * 1000;
}

function midiTone(midiNoteNumber) {
  return Tone.Frequency(midiNoteNumber, "midi").toNote();
}
function midiTones(midiNoteNumberArray) {
  return midiNoteNumberArray.map(midiTone);
}

function playCadence(config, chords) {
  // chords is an array of arrays of midi numbers.
  const synth = new Tone.PolySynth().toDestination();
  Tone.Transport.bpm.value = config.tempo;
  const tonic = config.tonic;

  try {
    const start = Tone.now();
    for (let i = 0; i < chords.length; ++i) {
      synth.triggerAttackRelease(
        midiTones(chords[i]),
        "8n.",
        start + i * bpmSeconds(config.tempo),
      );
    }
  } catch (e) {
    synth.stop();
  }
}

function tonicizeChord(config, chord) {
  // chord is an array of midi numbers.
  return chord.map((note) => config.tonic + note);
}
function tonicizeChords(config, chords) {
  // chords is an array of arrays of midi numbers.
  return chords.map((chord) => tonicizeChord(config, chord));
}

function playMajorCadence(config) {
  const tonic = config.tonic;
  playCadence(
    config,
    tonicizeChords(config, [
      [0, 4, 7, 12],
      [0 - 7, 4 - 7, 7 - 7, 12 - 7],
      [-5, 5, 11, 14],
      [0, 4, 7, 12],
    ]),
  );
}

function playMinorCadence(config) {
  const tonic = config.tonic;
  playCadence(
    config,
    tonicizeChords(config, [
      [0, 3, 7, 12],
      [0 - 7, 3 - 7, 7 - 7, 12 - 7],
      [0 - 5, 3 - 5, 7 - 5, 12 - 5],
      [0, 3, 7, 12],
    ]),
  );
}

function initializePresetSelect(selectId, presets) {
  const select = document.getElementById(selectId);
  // Clear existing options
  select.innerHTML = "";

  Object.keys(presets).forEach((presetName) => {
    const option = document.createElement("option");
    option.value = presetName;
    option.textContent = presetName;
    select.appendChild(option);
  });
}

function addPresetToSelect(selectId, presetName) {
  const select = document.getElementById(selectId);
  const option = document.createElement("option");
  option.value = presetName;
  option.textContent = presetName;
  select.appendChild(option);
  // Select the newly added preset
  select.value = presetName;
}

function getRandomPitchInRange(config) {
  return getRandomInt(config.highPitch + 1 - config.lowPitch) + config.lowPitch;
}

function importConfigHelper(setConfigFunc) {
  try {
    const configJson = document.getElementById("configIO").value;
    const newConfig = JSON.parse(configJson);
    setConfigFunc(newConfig);
    return newConfig;
  } catch (e) {
    alert("Error importing configuration: " + e.message);
  }
}

function setupTonicNameUpdate() {
  document.getElementById("tonic").addEventListener("input", function () {
    document.getElementById("tonicName").textContent = noteName(this.value);
  });
}
