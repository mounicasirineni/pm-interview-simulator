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
  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(track => track.stop());
  isRecording = false;
  document.getElementById('recording-indicator').style.display = 'none';
  document.getElementById('mic-btn').classList.remove('recording');

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const transcript = await transcribeWithSarvam(audioBlob);
    if (transcript) onTranscript(transcript);
  };
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
  return data.transcript || null;
}
