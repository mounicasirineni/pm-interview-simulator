let recognition = null;
let isRecording = false;
let accumulatedTranscript = '';

export function getIsRecording() {
  return isRecording;
}

export function toggleRecording(onTranscript, onInterim) {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording(onTranscript, onInterim);
  }
}

function startRecording(onTranscript, onInterim) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition not supported. Please use Chrome.');
    return;
  }

  accumulatedTranscript = '';
  recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        accumulatedTranscript += text + ' ';
      } else {
        interim = text;
      }
    }
    // Show accumulated final + current interim in textarea
    if (onInterim) onInterim(accumulatedTranscript + interim);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) recognition.start(); // keep alive mid-speech
  };

  recognition.start();
  isRecording = true;
  document.getElementById('recording-indicator').style.display = 'inline';
  document.getElementById('mic-btn').classList.add('recording');
}

function stopRecording() {
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }
  isRecording = false;
  document.getElementById('recording-indicator').style.display = 'none';
  document.getElementById('mic-btn').classList.remove('recording');
}