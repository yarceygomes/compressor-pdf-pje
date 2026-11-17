/* Horizonte Park — trilha ambiente original, sintetizada em tempo real (Web Audio API).
   Pads em Ré maior, kalimba pentatônica, baixo suave, rio ao fundo e pássaros ocasionais.
   Não usa arquivos de áudio: nenhum download e nenhuma questão de direitos autorais. */
(() => {
  const btn = document.getElementById('soundBtn');
  if (!btn || !(window.AudioContext || window.webkitAudioContext)) { if (btn) btn.hidden = true; return; }

  const KEY = 'hp-sound';
  let ctx, master, reverb, delay, playing = false, timer = null, nextTime = 0, step = 0, birdAt = 0, riverGain;
  const BPM = 72, EIGHTH = 60 / BPM / 2, STEPS_PER_CHORD = 16; // 2 compassos por acorde
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Dmaj9 · Bm11 · Gmaj9 · A6sus — progressão aberta, luminosa
  const CHORDS = [
    { pad: [50, 57, 61, 64, 66], bass: 38 },
    { pad: [47, 54, 57, 62, 64], bass: 35 },
    { pad: [43, 50, 54, 57, 59], bass: 43 },
    { pad: [45, 52, 57, 59, 62], bass: 45 },
  ];
  const PENTA = [74, 76, 78, 81, 83, 86, 88]; // Ré pentatônica maior
  let rnd = 0.5;
  const rand = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;

  function impulse(sec = 3.8, decay = 2.6) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = impulse();
    const revGain = ctx.createGain(); revGain.gain.value = 0.55;
    reverb.connect(revGain).connect(master);

    delay = ctx.createDelay(2);
    delay.delayTime.value = EIGHTH * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    delay.connect(dlp).connect(fb).connect(delay);
    const dOut = ctx.createGain(); dOut.gain.value = 0.35;
    dlp.connect(dOut).connect(master);
    dOut.connect(reverb);

    river();
  }

  /* Rio: ruído marrom filtrado, com ondulação lenta */
  function river() {
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.6;
    riverGain = ctx.createGain(); riverGain.gain.value = 0.11;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 0.04;
    lfo.connect(lfoG).connect(riverGain.gain);
    src.connect(bp).connect(riverGain).connect(master);
    riverGain.connect(reverb);
    src.start(); lfo.start();
  }

  function pad(notes, t, dur) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.06, t + 2.4);
    out.gain.setValueAtTime(0.06, t + dur - 0.2);
    out.gain.linearRampToValueAtTime(0, t + dur + 3.2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(1300, t + dur * 0.6);
    lp.frequency.linearRampToValueAtTime(700, t + dur + 3);
    out.connect(lp); lp.connect(master); lp.connect(reverb);
    notes.forEach((m, i) => {
      [-6, 6].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine';
        o.frequency.value = mtof(m); o.detune.value = det + (rand() - 0.5) * 4;
        const g = ctx.createGain(); g.gain.value = 0.5 / notes.length;
        o.connect(g).connect(out);
        o.start(t); o.stop(t + dur + 3.5);
      });
    });
  }

  function bass(m, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 1);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 1.2);
  }

  /* Kalimba: senoide + parcial inarmônico, ataque rápido */
  function kalimba(m, t, vel) {
    const f = mtof(m), g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 1.8);
    [[1, 1], [5.4, 0.18], [2, 0.12]].forEach(([mul, amp]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * mul; og.gain.value = amp;
      if (mul > 2) { og.gain.setValueAtTime(amp, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); }
      o.connect(og).connect(g); o.start(t); o.stop(t + 2);
    });
    let node = g;
    if (pan) { pan.pan.value = (rand() - 0.5) * 1.2; g.connect(pan); node = pan; }
    node.connect(master); node.connect(reverb); node.connect(delay);
  }

  /* Pássaro: sequência curta de assobios com glissando */
  function bird(t) {
    const n = 2 + Math.floor(rand() * 3), base = 2600 + rand() * 1600;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = ctx.createGain(); out.gain.value = 0.035;
    if (pan) { pan.pan.value = rand() * 1.6 - 0.8; out.connect(pan).connect(reverb); pan.connect(master); } else { out.connect(reverb); }
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.13 + rand() * 0.08), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (0.9 + rand() * 0.2), s);
      o.frequency.exponentialRampToValueAtTime(base * (1.25 + rand() * 0.4), s + 0.07);
      o.frequency.exponentialRampToValueAtTime(base * 0.95, s + 0.11);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(1, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
      o.connect(g).connect(out); o.start(s); o.stop(s + 0.14);
    }
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.4) {
      const ci = Math.floor(step / STEPS_PER_CHORD) % CHORDS.length, local = step % STEPS_PER_CHORD;
      const ch = CHORDS[ci];
      if (local === 0) {
        const dur = EIGHTH * STEPS_PER_CHORD;
        pad(ch.pad, nextTime, dur);
        bass(ch.bass, nextTime, dur * 0.5);
        bass(ch.bass, nextTime + dur * 0.5, dur * 0.5);
      }
      // kalimba: mais densa nos tempos fortes, respirando nos fracos
      const p = local % 4 === 0 ? 0.55 : local % 2 === 0 ? 0.3 : 0.14;
      if (rand() < p) {
        const pool = PENTA.filter((m) => ch.pad.some((c) => (m - c) % 12 === 0) || rand() < 0.35);
        kalimba(pool[Math.floor(rand() * pool.length)] || 74, nextTime + (rand() - 0.5) * 0.02, 0.6 + rand() * 0.4);
      }
      if (nextTime > birdAt) { bird(nextTime); birdAt = nextTime + 7 + rand() * 11; }
      nextTime += EIGHTH; step++;
    }
  }

  function fadeTo(v, sec) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(v, t + sec);
  }

  async function play() {
    if (!ctx) init();
    if (ctx.state === 'suspended') await ctx.resume();
    if (!timer) { nextTime = ctx.currentTime + 0.1; birdAt = nextTime + 4; timer = setInterval(schedule, 120); schedule(); }
    fadeTo(0.8, 2.5);
    playing = true; render();
    try { localStorage.setItem(KEY, 'on'); } catch (e) {}
  }
  function pause(remember = true) {
    if (!ctx) return;
    fadeTo(0, 1.2);
    playing = false; render();
    setTimeout(() => { if (!playing) { clearInterval(timer); timer = null; ctx.suspend(); } }, 1400);
    if (remember) { try { localStorage.setItem(KEY, 'off'); } catch (e) {} }
  }
  function render() {
    btn.classList.toggle('on', playing);
    btn.setAttribute('aria-pressed', String(playing));
    btn.querySelector('.snd__label').textContent = playing ? 'Som ligado' : 'Ligar som';
  }

  btn.addEventListener('click', () => (playing ? pause() : play()));
  window.HP = window.HP || {};
  window.HP.sound = { play, pause, get playing() { return playing; } };

  // Se a pessoa já tinha ligado o som antes, retoma no primeiro clique em qualquer lugar
  let pref = null;
  try { pref = localStorage.getItem(KEY); } catch (e) {}
  if (pref === 'on') {
    const resume = (e) => { if (e.target.closest('#soundBtn')) return; play(); removeEventListener('pointerdown', resume, true); };
    addEventListener('pointerdown', resume, true);
  }
  // Pausa ao trocar de aba e ao abrir o vídeo
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden && playing) { ctx.suspend(); } else if (!document.hidden && playing) { ctx.resume(); }
  });
  document.querySelector('#video button')?.addEventListener('click', () => { if (playing) pause(false); });
})();
