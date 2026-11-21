import { messages } from './messages.ts';
import { CUTS, DURATION, position } from './timeline.mjs';
import { createRenderer } from './scenes.mjs';
import { createScore } from './audio.mjs';

const canvas = document.querySelector('canvas');
const get = id => document.getElementById(id);
document.title = messages.title;
canvas.setAttribute('aria-label', messages.canvasLabel);
get('title').textContent = messages.title.split('|')[1].trim();
for (const id of ['about', 'details', 'download']) get(id).textContent = messages[id];
get('eyebrow').textContent = messages.preview;
get('play').textContent = messages.play;
get('sound').textContent = messages.soundOn;
get('seek').setAttribute('aria-label', messages.seek);
get('overlay').setAttribute('aria-label', messages.play);
get('status').textContent = messages.loading;
let render;
let time = 0;
let playing = false;
let sound = false;
let epoch = 0;
let context;
let animation;
const chapters = messages.steps.map((item, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = item.name;
  button.addEventListener('click', () => seek(CUTS[index] + 0.9));
  get('chapters').append(button);
  return button;
});

function update(t) {
  const state = render(t);
  get('seek').value = String(t);
  get('time').textContent = `00:${String(Math.floor(t)).padStart(2, '0')} / 00:31`;
  chapters.forEach((button, i) => button.setAttribute('aria-current', String(i === state.index)));
}

async function stopAudio() {
  const previous = context;
  context = undefined;
  if (previous && previous.state !== 'closed') await previous.close();
}

async function startAudio(offset) {
  await stopAudio();
  if (!sound) return;
  context = new AudioContext();
  await context.resume();
  const score = createScore(context);
  score.output.connect(context.destination);
  score.schedule(context.currentTime + 0.05, offset);
}

function tick(now) {
  if (!playing) return;
  time = Math.min(DURATION, (now - epoch) / 1000);
  update(time);
  if (time >= DURATION) {
    playing = false;
    get('play').textContent = messages.replay;
    get('overlay').classList.remove('playing');
    void stopAudio();
  } else animation = requestAnimationFrame(tick);
}

async function toggle() {
  if (!render) return;
  if (playing) {
    playing = false;
    cancelAnimationFrame(animation);
    await stopAudio();
  } else {
    if (time >= DURATION) time = 0;
    await startAudio(time);
    epoch = performance.now() - time * 1000;
    playing = true;
    animation = requestAnimationFrame(tick);
  }
  get('play').textContent = playing ? messages.pause : messages.play;
  get('overlay').classList.toggle('playing', playing);
  get('overlay').setAttribute('aria-label', playing ? messages.pause : messages.play);
}

async function seek(t) {
  time = Math.min(DURATION, Math.max(0, t));
  update(time);
  if (playing) {
    await startAudio(time);
    epoch = performance.now() - time * 1000;
  }
}

get('play').addEventListener('click', toggle);
get('overlay').addEventListener('click', toggle);
get('seek').addEventListener('input', event => seek(Number(event.target.value)));
get('sound').addEventListener('click', async () => {
  sound = !sound;
  get('sound').textContent = sound ? messages.soundOff : messages.soundOn;
  if (playing) await startAudio(time);
});

async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

async function record() {
  playing = false;
  cancelAnimationFrame(animation);
  await stopAudio();
  const audio = new AudioContext({ sampleRate: 48000 });
  await audio.resume();
  const destination = audio.createMediaStreamDestination();
  const score = createScore(audio);
  score.output.connect(destination);
  const stream = canvas.captureStream(30);
  destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
  const candidates = ['video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1.420033,mp4a.40.2', 'video/mp4'];
  const mimeType = candidates.find(value => MediaRecorder.isTypeSupported(value));
  if (!mimeType) throw new Error('MP4 recording is unavailable in this browser');
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12000000, audioBitsPerSecond: 192000 });
  const chunks = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const completed = new Promise((resolve, reject) => {
    recorder.onstop = resolve;
    recorder.onerror = event => reject(event.error);
  });
  render(0);
  const start = performance.now();
  recorder.start(1000);
  score.schedule(audio.currentTime + 0.035);
  await new Promise(resolve => {
    function frame(now) {
      const t = (now - start) / 1000;
      render(Math.min(t, DURATION));
      if (t < DURATION) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  recorder.stop();
  await completed;
  stream.getTracks().forEach(track => track.stop());
  await audio.close();
  const blob = new Blob(chunks, { type: recorder.mimeType });
  const reader = new FileReader();
  const dataUrl = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { dataUrl, mimeType: recorder.mimeType, size: blob.size };
}

try {
  await Promise.all([
    document.fonts.load('700 100px Changa', 'كوتشيفو'),
    document.fonts.load('500 40px Alexandria', 'خطوتك الجاية'),
    document.fonts.load('600 24px Manrope'),
  ]);
  const names = ['dashboard', 'program', 'nutrition', 'workout', 'muscles', 'progress'];
  const pairs = await Promise.all(names.map(async name => [name, await loadImage(`./assets/${name}.jpg`)]));
  const assets = Object.fromEntries(pairs);
  assets.compact = await loadImage('/brand-png/logo-compact@2x.png');
  assets.primary = await loadImage('/brand-png/logo-primary@2x.png');
  const response = await fetch('/brand-tokens/palette.json');
  if (!response.ok) throw new Error('Brand palette failed to load');
  const palette = await response.json();
  render = createRenderer(canvas, assets, palette.dark, messages);
  update(1.6);
  get('status').textContent = '';
  window.reel = { render, record, ready: true, position, messages, duration: DURATION };
  const video = await fetch('./kochivo-day.mp4', { method: 'HEAD' });
  if (video.ok) get('download').hidden = false;
} catch (error) {
  get('status').textContent = messages.failed;
  console.error(error);
}
