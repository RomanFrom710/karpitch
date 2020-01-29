import MidiFile from 'midifile';
import windows1251 from 'windows-1251';
import {findPitch} from 'pitchy';

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

function updatePitch(analyserNode, sampleRate) {
  const data = new Float32Array(analyserNode.fftSize);
  analyserNode.getFloatTimeDomainData(data);
  const [pitch, clarity] = findPitch(data, sampleRate);
 
  if (pitch < 400 && clarity > 0.95) {
    context.fillStyle = 'white';
    context.fillRect(0, 0, 400, 400);
    context.fillStyle = 'black';
    context.fillRect(200, Math.round(pitch), 20, 20);
  }
  window.requestAnimationFrame(() => updatePitch(analyserNode, sampleRate));
}

document.getElementById('drop').addEventListener('dragenter', (e) => e.preventDefault());
document.getElementById('drop').addEventListener('dragover', (e) => e.preventDefault());
document.getElementById('drop').addEventListener('drop', async (e) => {
  e.preventDefault();
  console.log(e.dataTransfer.files[0]);
  const arrayBuffer = await e.dataTransfer.files[0].arrayBuffer();
  const file = new MidiFile(arrayBuffer);
  const lyrics = file.getLyrics();
  const text = lyrics.map((item) => item.text).join('');
  document.getElementById('lyrics').innerHTML = windows1251.decode(text);
});

async function start() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyserNode = audioContext.createAnalyser();

  const stream = await navigator.mediaDevices.getUserMedia({audio: true})
  let sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyserNode);
  updatePitch(analyserNode, audioContext.sampleRate);
}


document.getElementById('button').addEventListener('click', start);
