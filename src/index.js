import {findPitch} from 'pitchy';
import MidiPlayer from 'midi-player-js';
import Soundfont from 'soundfont-player';

import instrumentNames from './instruments';
import {PROGRAM_CHANGE, NOTE_ON, NOTE_OFF} from './midi-events';

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

let audioContext;

document.getElementById('drop').addEventListener('dragenter', (e) => e.preventDefault());
document.getElementById('drop').addEventListener('dragover', (e) => e.preventDefault());
document.getElementById('drop').addEventListener('drop', async (e) => {
  start();
  e.preventDefault();
  const arrayBuffer = await e.dataTransfer.files[0].arrayBuffer();

  const instruments = {};
  const loadPromises = {};
  const loadInstrument = async (midiProgram, track) => {
    if (!loadPromises[midiProgram]) {
      loadPromises[midiProgram] = Soundfont.instrument(audioContext, instrumentNames[midiProgram], {soundfont: 'FluidR3_GM'});
    }
    instruments[track] = await loadPromises[midiProgram];
  };

  const midiFile = new MidiPlayer.Player();
  midiFile.loadArrayBuffer(arrayBuffer);
  const notesOn = {};
  midiFile.on('midiEvent', (event) => {
    const code = `${event.track}_${event.noteNumber}`;
    if (event.name === NOTE_ON && event.velocity > 0) {
      notesOn[code] = instruments[event.track].play(event.noteNumber);
    } else if (event.name === NOTE_OFF || (event.name === NOTE_ON && event.velocity === 0)) {
      notesOn[code] && notesOn[code].stop();
    }
  });

  midiFile.getEvents()
    .map((track) => track.find((e) => e.name === PROGRAM_CHANGE))
    .forEach((event) => event && loadInstrument(event.value, event.track));

  await Promise.all(Object.values(loadPromises));
  midiFile.play();
});

async function start() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyserNode = audioContext.createAnalyser();

  const stream = await navigator.mediaDevices.getUserMedia({audio: true})
  let sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyserNode);
  updatePitch(analyserNode, audioContext.sampleRate);
}
