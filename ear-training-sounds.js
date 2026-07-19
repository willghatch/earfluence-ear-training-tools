///////////////////////////////////////////////////////////////////////////////
//// Sound generation shared by all of the ear training tools.
////
//// Tools differ in how they schedule notes, but they all want the same set of
//// instruments and the same output chain, so both live here.
////
//// Note that this file is loaded before Tone.js, so nothing here may touch
//// `Tone` at load time -- only from inside a function.
////////////////////////////////////////////////////////////////////////////////

// DX7-style electric piano.  The modulator envelope decays much faster than
// the carrier's, so the bell-like attack gives way to a nearly sinusoidal
// body.  That thinning is what makes it hold up under chords: the partials get
// sparse exactly when several notes are overlapping.
const epianoDefinition = {
  synth: "FMSynth",
  options: {
    harmonicity: 3,
    modulationIndex: 12,
    oscillator: { type: "sine" },
    envelope: { attack: 0.002, decay: 1.6, sustain: 0.2, release: 0.9 },
    modulation: { type: "sine" },
    modulationEnvelope: {
      attack: 0.002,
      decay: 0.35,
      sustain: 0,
      release: 0.3,
    },
  },
};

// Instrument definitions.  Each entry describes how to build one voice:
//
//   synth      -- name of the Tone class to instantiate
//   options    -- options passed to that class
//   filterHz   -- if set, a lowpass placed after the synth
//
// Envelopes here are percussive except where an instrument's character depends
// on holding (see e-organ): they decay to a low sustain rather than staying
// near full amplitude.  A sustained envelope makes every note in a chord
// contribute its full level for the whole duration, which both piles up in
// volume and smears the inner voices together.  Letting notes bloom and settle
// keeps chords legible.
const instrumentDefinitions = {
  // "default" is the electric piano.  It is the friendliest of the set to
  // listen to for a long practice session and the easiest to hear chord tones
  // in, which is what the default should optimize for.
  default: epianoDefinition,
  epiano: epianoDefinition,
  sine: {
    synth: "Synth",
    options: {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.25 },
    },
  },
  triangle: {
    synth: "Synth",
    options: {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.25 },
    },
    filterHz: 8000,
  },
  square: {
    synth: "Synth",
    options: {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.25, release: 0.25 },
    },
    // Square and sawtooth carry full strength high harmonics at every pitch,
    // which turns high chords into a buzzing wall.  Roll the top off.
    filterHz: 4000,
  },
  sawtooth: {
    synth: "Synth",
    options: {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.25, release: 0.25 },
    },
    filterHz: 3500,
  },
  // Drawbar organ.  The partials are the classic sine drawbar registration
  // (fundamental, octave, twelfth, two octaves, with the upper odd harmonics
  // pulled out), which is what makes it read as an organ rather than as a
  // filtered sawtooth.
  //
  // Unlike the rest of the set this one deliberately holds: an organ note does
  // not decay while a key is down, and taking that away would leave it sounding
  // like something else.  The lowpass and the gain compensation are what keep
  // it from piling up in chords.
  "e-organ": {
    synth: "Synth",
    options: {
      oscillator: {
        type: "custom",
        partials: [1, 0.6, 0.4, 0.35, 0, 0.2, 0, 0.15],
      },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.85, release: 0.12 },
    },
    filterHz: 5000,
  },
};

const instrumentNames = Object.keys(instrumentDefinitions);

// Config forms want [{value: "sine"}, ...].
function instrumentOptions() {
  return instrumentNames.map((name) => ({ value: name }));
}

function instrumentDefinition(name) {
  return instrumentDefinitions[name] || instrumentDefinitions.default;
}

// Tools spell the setting differently: the chord tools have a single
// `instrument`, while the ones with independent voices have an `instruments`
// list.  Anything played as a whole (a cadence, say) wants one instrument, so
// take the first voice's for the list case.
function configInstrument(config) {
  if (config.instrument) {
    return config.instrument;
  }
  if (config.instruments && config.instruments.length) {
    return config.instruments[0];
  }
  return "default";
}

// Simultaneous voices sum in amplitude, so without compensation a four note
// chord arrives roughly four times as loud as a single note and clips.  Equal
// power (1/sqrt(n)) keeps perceived loudness roughly constant across chord
// sizes without making chords feel weak the way full 1/n compensation does.
function voiceGain(voiceCount) {
  return 1 / Math.sqrt(Math.max(1, voiceCount || 1));
}

// Every instrument built against a given destination shares one reverb, so the
// tools do not pay for a convolver per voice.  Tone.Reverb generates its
// impulse response asynchronously; until it is ready the dry path still passes
// audio, so an early note is at worst briefly dry rather than silent.
const sharedOutputChains = new WeakMap();
function sharedOutputChain(destination) {
  let chain = sharedOutputChains.get(destination);
  if (!chain) {
    // A little space keeps chords from sounding like one fused object, but
    // stays subtle enough not to blur pitch.
    chain = new Tone.Reverb({ decay: 1.2, wet: 0.14 }).connect(destination);
    sharedOutputChains.set(destination, chain);
  }
  return chain;
}

function connectThroughChain(synth, definition, destination, voiceCount) {
  const gain = new Tone.Gain(voiceGain(voiceCount)).connect(
    sharedOutputChain(destination),
  );
  if (definition.filterHz) {
    const filter = new Tone.Filter(definition.filterHz, "lowpass").connect(
      gain,
    );
    synth.connect(filter);
  } else {
    synth.connect(gain);
  }
  return synth;
}

// Build a single-voice instrument, for tools that assign one instrument per
// voice and trigger each voice separately.
function makeSynth(instrumentName, destination, voiceCount) {
  const definition = instrumentDefinition(instrumentName);
  const synth = new Tone[definition.synth](definition.options);
  return connectThroughChain(synth, definition, destination, voiceCount);
}

// Build a polyphonic instrument, for tools that trigger whole chords at once.
// voiceCount should be the typical number of notes sounding together.
function makePolySynth(instrumentName, destination, voiceCount) {
  const definition = instrumentDefinition(instrumentName);
  const synth = new Tone.PolySynth(Tone[definition.synth], definition.options);
  return connectThroughChain(synth, definition, destination, voiceCount);
}
