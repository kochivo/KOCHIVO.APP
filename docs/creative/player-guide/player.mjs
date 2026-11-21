import { messages } from './messages.ts';
import { createTimeline, locate, formatTime } from './timeline.mjs';
import { createRenderer } from './scenes.mjs';

const get = id => document.getElementById(id);
const canvas = document.querySelector('canvas');
const timeline = createTimeline(messages.scenes);
document.title = messages.title;
canvas.setAttribute('aria-label', messages.title);
get('chapters').setAttribute('aria-label', messages.chaptersLabel);
get('seek').setAttribute('aria-label', messages.seek);
get('seek').max = String(timeline.duration);
for (const id of ['heading', 'eyebrow', 'about', 'silent', 'details', 'previous', 'next']) get(id).textContent = messages[id];
get('details-title').textContent = messages.sources;
get('play').textContent = messages.play;
get('export').textContent = messages.export;
get('status').textContent = messages.loading;
let time = 0;
let playing = false;
let exporting = false;
let epoch = 0;
let frame;
let render;
const chapters = messages.chapters.map((name, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `${String(index + 1).padStart(2, '0')}  ${name}`;
  button.disabled = true;
  button.addEventListener('click', () => seek(timeline.entries.find(scene => scene.chapter === index).start + .6));
  get('chapters').append(button);
  return button;
});

function update(value) {
  const state = render(value);
  time = state.time;
  get('seek').value = String(time);
  get('time').textContent = `${formatTime(time)} / ${formatTime(timeline.duration)}`;
  const chapter = timeline.entries[state.index].chapter;
  chapters.forEach((button, i) => button.setAttribute('aria-current', String(i === chapter)));
  get('previous').disabled = exporting || state.index === 0;
  get('next').disabled = exporting || state.index === timeline.entries.length - 1;
  return state;
}

function tick(now) {
  if (!playing) return;
  update(Math.min(timeline.duration, (now - epoch) / 1000));
  if (time >= timeline.duration) pause();
  else frame = requestAnimationFrame(tick);
}

function pause() {
  playing = false;
  cancelAnimationFrame(frame);
  get('play').textContent = time >= timeline.duration ? messages.replay : messages.play;
}

function toggle() {
  if (!render || exporting) return;
  if (playing) { pause(); return; }
  if (time >= timeline.duration) update(0);
  epoch = performance.now() - time * 1000;
  playing = true;
  get('play').textContent = messages.pause;
  frame = requestAnimationFrame(tick);
}

function seek(value) {
  if (!render || exporting) return;
  update(value);
  if (playing) {
    epoch = performance.now() - time * 1000;
    if (time >= timeline.duration) pause();
  } else get('play').textContent = time >= timeline.duration ? messages.replay : messages.play;
}

get('play').addEventListener('click', toggle);
get('previous').addEventListener('click', () => seek(timeline.entries[Math.max(0, locate(timeline, time).index - 1)].start + .6));
get('next').addEventListener('click', () => seek(timeline.entries[Math.min(timeline.entries.length - 1, locate(timeline, time).index + 1)].start + .6));
get('seek').addEventListener('input', event => seek(Number(event.target.value)));

async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

async function exportVideo() {
  if (exporting || !render) return;
  const formats = ['video/mp4;codecs=avc1.420033', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const mimeType = formats.find(value => MediaRecorder.isTypeSupported(value));
  if (!mimeType) { get('status').textContent = messages.exportFailed; return; }
  pause();
  exporting = true;
  get('status').textContent = messages.exporting;
  document.querySelectorAll('button, input').forEach(control => { control.disabled = true; });
  const stream = canvas.captureStream(30);
  const chunks = [];
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
    const stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = resolve;
      recorder.onerror = event => reject(event.error);
    });
    recorder.start(1000);
    const start = performance.now();
    await new Promise(resolve => {
      function draw(now) {
        const elapsed = (now - start) / 1000;
        update(Math.min(elapsed, timeline.duration));
        if (elapsed < timeline.duration) requestAnimationFrame(draw);
        else resolve();
      }
      requestAnimationFrame(draw);
    });
    recorder.stop();
    await stopped;
    const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${messages.filename}.${recorder.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    document.body.append(link);
    link.click();
    link.remove();
    // Leave the download URL alive until the page closes so slow downloads can complete.
    get('status').textContent = messages.exportDone;
  } catch (error) {
    get('status').textContent = messages.exportFailed;
    console.error(error);
  } finally {
    if (recorder?.state === 'recording') recorder.stop();
    stream.getTracks().forEach(track => track.stop());
    exporting = false;
    document.querySelectorAll('button, input').forEach(control => { control.disabled = false; });
    update(time);
    pause();
  }
}
get('export').addEventListener('click', exportVideo);

try {
  const response = await fetch('/brand-tokens/palette.json');
  if (!response.ok) throw new Error('Brand palette unavailable');
  const colors = (await response.json()).dark;
  Object.entries(colors).forEach(([name, color]) => document.documentElement.style.setProperty(`--${name}`, color));
  await Promise.all([
    document.fonts.load('700 67px Changa', 'دليل اللاعب'),
    document.fonts.load('500 44px Alexandria', 'رحلتك تبدأ هنا'),
    document.fonts.load('500 23px Manrope'),
  ]);
  const names = [...new Set(messages.scenes.flatMap(scene => scene.asset ? [scene.asset] : []))];
  const pairs = await Promise.all(names.map(async name => [name, await loadImage(`./assets/${name}.png`)]));
  const images = Object.fromEntries(pairs);
  images.logo = await loadImage('/brand-png/logo-compact@2x.png');
  render = createRenderer(canvas, images, colors, messages, timeline);
  document.querySelectorAll('button, input').forEach(control => { control.disabled = false; });
  update(1);
  get('status').textContent = '';
  window.guide = { render: update, seek, timeline, messages, ready: true,
    get playing() { return playing; }, get time() { return time; } };
} catch (error) {
  get('status').textContent = messages.failed;
  console.error(error);
}
