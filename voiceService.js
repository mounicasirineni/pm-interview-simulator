const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY;

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

export function getIsRecording() {
  return isRecording;
}

export async function toggleRecording(onTranscript) {
  if (isRecording) {
    stopRecording(onTranscript);
  } else {
    await startRecording();
  }
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.start();
  isRecording = true;
  document.getElementById('recording-indicator').style.display = 'inline';
  document.getElementById('mic-btn').classList.add('recording');
}

function stopRecording(onTranscript) {
  mediaRecorder.onstop = async () => {
  console.log('onstop fired, chunks:', audioChunks.length);
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  console.log('blob size:', audioBlob.size);
  const transcript = await transcribeWithSarvam(audioBlob);
  console.log('transcript from Sarvam:', transcript);
  if (transcript) onTranscript(transcript);
};

  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(track => track.stop());
  isRecording = false;
  document.getElementById('recording-indicator').style.display = 'none';
  document.getElementById('mic-btn').classList.remove('recording');
}

async function transcribeWithSarvam(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'saaras:v3');
  formData.append('language_code', 'en-IN');

  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': SARVAM_API_KEY },
    body: formData
  });

  const data = await response.json();
  console.log('Sarvam raw response:', data);
  return data.transcript || null;
}
