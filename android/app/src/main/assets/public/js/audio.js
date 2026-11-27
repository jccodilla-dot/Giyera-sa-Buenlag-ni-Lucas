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

  var demonCurve = null;
  function getDemonShaper(c) {
    if (!demonCurve) {
      demonCurve = new Float32Array(256);
      for (var i = 0; i < 256; i++) {
        var x = (i * 2) / 256 - 1;
        demonCurve[i] = ((3 + 12) * x * 20 * (Math.PI / 180)) / (Math.PI + 12 * Math.abs(x));
      }
    }
    var shaper = c.createWaveShaper();
    shaper.curve = demonCurve;
    shaper.oversample = '2x';
    return shaper;
  }

  function playDemonLaughSyllable(pitchStart, pitchEnd, dur, vol, delay) {
    var c = ensureAudio();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);

    // Primary deep male vocal cords + sub-octave demonic growl
    var oscMain = c.createOscillator();
    oscMain.type = 'sawtooth';
    oscMain.frequency.setValueAtTime(pitchStart, t0);
    oscMain.frequency.exponentialRampToValueAtTime(Math.max(42, pitchEnd), t0 + dur);

    var oscSub = c.createOscillator();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(pitchStart * 0.5, t0);
    oscSub.frequency.exponentialRampToValueAtTime(Math.max(24, pitchEnd * 0.5), t0 + dur);

    var shaper = getDemonShaper(c);

    // Dark masculine throat formants ("HA" / "MWA")
    var f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(520, t0);
    f1.Q.value = 3.8;

    var f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(980, t0);
    f2.Q.value = 4.6;

    var lowBoost = c.createBiquadFilter();
    lowBoost.type = 'lowpass';
    lowBoost.frequency.setValueAtTime(1450, t0);

    var g = c.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    oscMain.connect(shaper);
    oscSub.connect(lowBoost);
    shaper.connect(f1);
    shaper.connect(f2);
    f1.connect(lowBoost);
    f2.connect(lowBoost);
    lowBoost.connect(g);
    g.connect(masterGain);

    oscMain.start(t0);
    oscSub.start(t0);
    oscMain.stop(t0 + dur + 0.03);
    oscSub.stop(t0 + dur + 0.03);
  }

  // "Patay!" vocalization + deep Male Demon Laugh ("MWA-HA-HA-HA-HA!") on death
  function playDeathPatayLaugh() {
    var c = ensureAudio();
    if (!c) return;
    var nowMs = performance.now();
    if (nowMs - lastLaughTime < 750) return;
    lastLaughTime = nowMs;

    // 1. SpeechSynthesis deep male demon voice if available on device
    try {
      if (window.speechSynthesis && !muted) {
        window.speechSynthesis.cancel();
        var utter = new SpeechSynthesisUtterance('Patay! Mwa ha ha ha ha!');
        utter.pitch = 0.25;
        utter.rate = 0.88;
        utter.volume = 1.0;
        var voices = window.speechSynthesis.getVoices();
        var maleVoice = voices.find(function (v) { return /male|david|mark|daniel|alex|george|ryan/i.test(v.name); });
        if (maleVoice) utter.voice = maleVoice;
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {}

    // 2. Guaranteed Offline Web Audio: "Pa-tay!" + Booming Male Demon Laugh
    playNoise(0.03, 1500, 1.4, 0.45, 0.0);
    playFormantSyllable(210, 240, 740, 1220, 0.13, 0.82, 0.02);
    playNoise(0.025, 2800, 1.5, 0.45, 0.16);
    playFormantSyllable(240, 310, 680, 1580, 0.2, 0.88, 0.18);

    // Deep echoing male demon laugh: "MWA-HA-HA-HA-HA-HA!"
    var demonSyllables = [
      [0.42, 148, 102, 0.24, 1.35],
      [0.68, 138, 94,  0.22, 1.35],
      [0.92, 130, 86,  0.22, 1.35],
      [1.16, 122, 78,  0.22, 1.30],
      [1.40, 114, 68,  0.24, 1.25],
      [1.66, 104, 52,  0.42, 1.40],
    ];
    for (var i = 0; i < demonSyllables.length; i++) {
      var s = demonSyllables[i];
      playNoise(0.08, 620, 0.9, 0.52, s[0]);
      playDemonLaughSyllable(s[1], s[2], s[3], s[4], s[0]);
      // Subtle cavernous echo tail
      playDemonLaughSyllable(s[1] * 0.96, s[2] * 0.92, s[3], s[4] * 0.36, s[0] + 0.11);
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
