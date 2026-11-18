// A loop of filtered surf and a handful of tuned oscillators supply the whole soundscape.
class WatchAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
  }
  prepare() {
    if (this.context) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio is unavailable');
    const ctx = this.context = new Audio();
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    const surf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const samples = surf.getChannelData(0);
    let low = 0;
    for (let i = 0; i < samples.length; i++) {
      low = (low + (Math.random() * 2 - 1) * .08) / 1.06;
      samples[i] = low * 2.9;
    }
    this.noise = surf;
    const sea = ctx.createBufferSource();
    sea.buffer = surf;
    sea.loop = true;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 570;
    const tide = ctx.createGain();
    tide.gain.value = .3;
    const swell = ctx.createOscillator();
    swell.frequency.value = .095;
    const depth = ctx.createGain();
    depth.gain.value = .13;
    swell.connect(depth).connect(tide.gain);
    sea.connect(tone).connect(tide).connect(this.master);
    const rain = ctx.createBufferSource();
    rain.buffer = surf;
    rain.loop = true;
    rain.playbackRate.value = 1.8;
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'highpass';
    hiss.frequency.value = 1100;
    this.rain = ctx.createGain();
    this.rain.gain.value = 0;
    rain.connect(hiss).connect(this.rain).connect(this.master);
    sea.start(); swell.start(); rain.start();
  }
  async toggle(quiet) {
    if (!this.enabled) {
      this.prepare();
      await this.context.resume();
    }
    this.enabled = !this.enabled;
    this.volume(quiet);
    return this.enabled;
  }
  volume(quiet) {
    if (this.context) this.master.gain.setTargetAtTime(this.enabled && !quiet ? .40 : 0, this.context.currentTime, .08);
  }
  weather(storm) {
    if (this.context && this.enabled) this.rain.gain.setTargetAtTime(storm * .9, this.context.currentTime, .8);
  }
  note(hz, length, strength, delay, wave = 'sine', endHz = hz, attack = .015) {
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, start);
    osc.frequency.exponentialRampToValueAtTime(endHz, start + length);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(strength, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    osc.connect(gain).connect(this.master);
    osc.onended = () => {osc.disconnect(); gain.disconnect();};
    osc.start(start); osc.stop(start + length + .03);
  }
  signal(kind) {
    if (!this.enabled || !this.context) return;
    if (kind === 'wreck') {
      for (const [hz,amp,duration] of [[166,.44,3.4],[331,.21,2.6],[419,.13,2],[673,.11,1.5],[923,.055,.7]]) this.note(hz,duration,amp,0);
    } else if (kind === 'arrival') {
      this.note(155,1.6,.24,.03,'triangle',148,.25);
      this.note(232,1.55,.075,.05,'sine',224,.25);
    } else if (kind === 'thunder') {
      const ctx = this.context;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.playbackRate.value = .47;
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass'; low.frequency.value = 155;
      const envelope = ctx.createGain();
      const start = ctx.currentTime + .55;
      envelope.gain.setValueAtTime(0,start);
      envelope.gain.linearRampToValueAtTime(.9,start+.33);
      envelope.gain.exponentialRampToValueAtTime(.001,start+3.6);
      src.connect(low).connect(envelope).connect(this.master);
      src.onended = () => {src.disconnect(); low.disconnect(); envelope.disconnect();};
      src.start(start); src.stop(start+3.7);
    }
  }
}
window.WatchAudio = WatchAudio;
