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

function makeChoices(lastChoices, config) {
  // Make choices for multiple voices.
  // lastChoices is a list of previous notes, one per voice.
  // Returns a list of new notes, one per voice.
  // If the previous note list is too short, default to null for any notes that are missing.
  const numVoices = config.numVoices || 1;
  const choices = [];
  for (let i = 0; i < numVoices; i++) {
    const lastChoice =
      lastChoices && i < lastChoices.length ? lastChoices[i] : null;
    choices.push(makeChoice(lastChoice, config));
  }
  return choices;
}

function bpmSeconds(bpm) {
  const bps = bpm / 60;
  const hz = 1 / bps;
  return hz;
}
function bpmMilliseconds(bpm) {
  return bpmSeconds(bpm) * 1000;
}

function computeVolumeDb(volumePercent) {
  return volumePercent === 0 ? -Infinity : Math.log10(volumePercent / 100) * 20;
}

function midiTone(midiNoteNumber) {
  return Tone.Frequency(midiNoteNumber, "midi").toNote();
}
function midiTones(midiNoteNumberArray) {
  return midiNoteNumberArray.map(midiTone);
}

function playCadence(config, chords) {
  // chords is an array of arrays of midi numbers.
  const volumeDb = computeVolumeDb(config.volume);
  const volumeNode = new Tone.Volume(volumeDb).toDestination();
  // Cadences are four note voicings, and follow whichever instrument the tool
  // is configured for so the reference does not change timbre mid-exercise.
  const synth = makePolySynth(configInstrument(config), volumeNode, 4);
  registerPlaybackSynths([synth], true);
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

function weightedRandomIndex(weightsArray) {
  // Select an index from a simple array of weights using weighted random.
  const choices = [];
  let total = 0;
  for (let i = 0; i < weightsArray.length; i++) {
    if (weightsArray[i] > 0) {
      total += weightsArray[i];
      choices.push({ choice: i, weightEnd: total });
    }
  }
  if (choices.length === 0) return 0;
  return makeWeightedChoice(choices);
}

function applyLooseVoicing(chordNotes, config) {
  // Randomize octaves of all notes except the lowest, keeping lowest fixed.
  // Each note stays within [lowPitch, highPitch] and above the lowest note.
  const lowestNote = Math.min(...chordNotes);
  let lowestUsed = false;
  return chordNotes.map((note) => {
    if (note === lowestNote && !lowestUsed) {
      lowestUsed = true;
      return note;
    }
    const pc = note % 12;
    const candidates = [];
    for (let n = pc; n <= config.highPitch; n += 12) {
      if (n > lowestNote && n >= config.lowPitch) {
        candidates.push(n);
      }
    }
    if (candidates.length === 0) return note;
    return candidates[getRandomInt(candidates.length)];
  });
}

////////////////////////////////////////////////////////////////////////////////
//// Playback control shared by all tools.
////////////////////////////////////////////////////////////////////////////////

// Tools schedule notes and their next iteration with setTimeout, so stopping
// requires both cancelling everything pending and silencing what is already
// sounding.  All playback timeouts go through playbackTimeout so that
// stopAllPlayback can cancel them.

const pendingPlaybackTimeouts = new Set();
let activePlaybackSynths = [];

function playbackTimeout(callback, delayMs) {
  const id = setTimeout(() => {
    pendingPlaybackTimeouts.delete(id);
    callback();
  }, delayMs);
  pendingPlaybackTimeouts.add(id);
  return id;
}

// Synths are created fresh for each play, so they are disposed on stop.
// Set disposeImmediately for synths that have notes scheduled ahead on Tone's
// own clock (cadences), since those cannot be cancelled by clearing timeouts.
function registerPlaybackSynths(synths, disposeImmediately) {
  synths.forEach((synth) =>
    activePlaybackSynths.push({ synth, disposeImmediately }),
  );
}

function stopAllPlayback() {
  pendingPlaybackTimeouts.forEach((id) => clearTimeout(id));
  pendingPlaybackTimeouts.clear();

  const registrations = activePlaybackSynths;
  activePlaybackSynths = [];
  registrations.forEach(({ synth, disposeImmediately }) => {
    if (synth.releaseAll) {
      synth.releaseAll();
    } else {
      synth.triggerRelease();
    }
    if (disposeImmediately) {
      synth.dispose();
    } else {
      // Dispose only after the release envelope and any effect tails finish,
      // otherwise the sound is cut off with a click.
      setTimeout(() => synth.dispose(), 3000);
    }
  });
}

// Play buttons show the action they will perform, colored for the current
// state, so the tool's play/stop state is visible at a glance.
function setPlayButtonState(playing) {
  document.querySelectorAll(".play-toggle-button").forEach((button) => {
    button.textContent = playing ? "Stop" : "Play";
    button.classList.toggle("btn-danger", playing);
    button.classList.toggle("btn-success", !playing);
  });
}
