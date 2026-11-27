(function () {
  'use strict';
  var ctx = null;
  var masterGain = null;
  var muted = false;
  var lastLaughTime = 0;

  function ensureAudio() {
    if (muted) return null;
    if (!ctx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 12;
      comp.ratio.value = 10;
      comp.attack.value = 0.002;
      comp.release.value = 0.14;
      masterGain = ctx.createGain();
      masterGain.gain.value = 1.65;
      masterGain.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function playTone(type, f1, f2, dur, vol, delay) {
    var c = ensureAudio();
    if (!c) return;
    var now = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(18, f2), now + dur);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function playNoise(dur, freq, q, vol, delay) {
    var c = ensureAudio();
    if (!c) return;
    var start = c.currentTime + (delay || 0);
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var env = Math.pow(1 - i / len, 1.4);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    var src = c.createBufferSource();
    src.buffer = buf;
    var flt = c.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = freq;
    flt.Q.value = q || 0.9;
    var g = c.createGain();
    g.gain.value = vol;
    src.connect(flt);
    flt.connect(g);
    g.connect(masterGain);
    src.start(start);
  }

  function playFormantSyllable(pitchStart, pitchEnd, f1, f2, dur, vol, delay) {
    var c = ensureAudio();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitchStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, pitchEnd), t0 + dur);

    var b1 = c.createBiquadFilter();
    b1.type = 'bandpass';
    b1.frequency.setValueAtTime(f1, t0);
    b1.Q.value = 5.5;

    var b2 = c.createBiquadFilter();
    b2.type = 'bandpass';
    b2.frequency.setValueAtTime(f2, t0);
    b2.Q.value = 6.5;

    var g = c.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    osc.connect(b1);
    osc.connect(b2);
    b1.connect(g);
    b2.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Flirty "Patay!" vocalization + loud "Nyahahahahaha" cackle on death
  function playDeathPatayLaugh() {
    var c = ensureAudio();
    if (!c) return;
    var nowMs = performance.now();
    if (nowMs - lastLaughTime < 650) return;
    lastLaughTime = nowMs;

    // 1. SpeechSynthesis flirty "Patay~" if available on device
    try {
      if (window.speechSynthesis && !muted) {
        window.speechSynthesis.cancel();
        var utter = new SpeechSynthesisUtterance('Patay! Nyahahahahaha!');
        utter.pitch = 1.65;
        utter.rate = 1.15;
        utter.volume = 1.0;
        var voices = window.speechSynthesis.getVoices();
        var fem = voices.find(function (v) { return /female|samantha|zira|hazel|google/i.test(v.name); });
        if (fem) utter.voice = fem;
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {}

    // 2. Guaranteed Offline Web Audio formant "Pa-tay~" + Loud "Nya-ha-ha-ha-ha-ha!"
    // "Pa-"
    playNoise(0.03, 1800, 1.5, 0.5, 0.0);
    playFormantSyllable(290, 340, 780, 1280, 0.14, 0.95, 0.02);
    // "-tay~" (flirty upward swoop)
    playNoise(0.025, 3400, 1.8, 0.55, 0.17);
    playFormantSyllable(330, 480, 720, 1850, 0.24, 1.05, 0.19);

    // Loud laughing "Nya-ha-ha-ha-ha-ha!"
    var laughNotes = [
      [0.48, 520, 420, 820, 1900, 0.14],
      [0.64, 480, 390, 760, 1520, 0.12],
      [0.78, 495, 405, 760, 1520, 0.12],
      [0.92, 460, 370, 760, 1520, 0.12],
      [1.06, 440, 345, 760, 1520, 0.13],
      [1.21, 415, 290, 740, 1460, 0.22],
    ];
    for (var i = 0; i < laughNotes.length; i++) {
      var n = laughNotes[i];
      playNoise(0.055, 2100, 1.1, 0.65, n[0]);
      playFormantSyllable(n[1], n[2], n[3], n[4], n[5], 1.25, n[0]);
    }
  }

  window.GameAudio = {
    ensure: ensureAudio,
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; },
    shot: function (weaponId) {
      if (weaponId === 'rifle') {
        playNoise(0.14, 1050, 0.7, 0.95);
        playNoise(0.05, 2800, 1.2, 0.65);
        playTone('sawtooth', 180, 42, 0.13, 0.55);
      } else if (weaponId === 'pulse') {
        playNoise(0.08, 1550, 0.9, 0.72);
        playTone('square', 280, 70, 0.07, 0.38);
      } else if (weaponId === 'shotgun') {
        playNoise(0.26, 620, 0.55, 1.15);
        playNoise(0.11, 2100, 0.8, 0.8);
        playTone('sawtooth', 145, 28, 0.25, 0.75);
      } else {
        playNoise(0.32, 420, 0.5, 1.2);
        playTone('sawtooth', 165, 24, 0.32, 0.8);
      }
    },
    casingPing: function () {
      playTone('sine', 3400, 2600, 0.045, 0.09, 0.12);
    },
    explosion: function () {
      playNoise(0.55, 280, 0.45, 1.25);
      playTone('sawtooth', 110, 20, 0.5, 0.85);
    },
    emp: function () {
      playTone('sine', 1600, 120, 0.42, 0.55);
      playTone('triangle', 820, 65, 0.45, 0.45);
    },
    footstep: function () {
      playNoise(0.05, 320, 1.1, 0.16);
    },
    reload: function (stage) {
      if (stage === 0) playTone('triangle', 280, 190, 0.09, 0.28);
      else if (stage === 1) playTone('triangle', 420, 680, 0.09, 0.3);
      else playTone('square', 780, 1120, 0.07, 0.28);
    },
    hit: function (isKill, isHeadshot) {
      if (isHeadshot) playTone('sine', 1520, 2100, 0.11, 0.42);
      else if (isKill) playTone('triangle', 680, 1180, 0.11, 0.34);
      else playTone('sine', 920, 540, 0.05, 0.22);
    },
    deathPatayLaugh: playDeathPatayLaugh,
    pickup: function () {
      playTone('sine', 540, 980, 0.12, 0.28);
    },
    hurt: function () {
      playTone('square', 140, 46, 0.16, 0.42);
    },
  };
})();
