import {
  createSession,
  updateConversationHistory,
  saveEvaluation
} from './supabase.js';
import { fetchQuestionExamples } from './researchService.js';
import { setupNavigation, loadDashboard } from './dashboard.js';
import { toggleRecording } from './voiceService.js';
import { generateQuestion, getInterviewerResponse, evaluateInterview, generateCoachFeedback } from './api.js';

const state = {
  selectedType: null,
  sessionId: null,
  initialQuestion: '',
  conversationHistory: [],
  isWaitingForResponse: false,
  isEvaluated: false,
  scores: null,
  recentQuestions: []
};

const elements = {
  setupScreen: document.getElementById('setup-screen'),
  interviewScreen: document.getElementById('interview-screen'),
  typeButtons: document.querySelectorAll('.type-btn'),
  startButton: document.getElementById('start-session'),
  evaluateButton: document.getElementById('evaluate-session'),
  initialQuestionContainer: document.getElementById('initial-question-container'),
  initialQuestionText: document.getElementById('initial-question-text'),
  conversationThread: document.getElementById('conversation-thread'),
  inputContainer: document.getElementById('input-container'),
  messageInput: document.getElementById('message-input'),
  sendButton: document.getElementById('send-message'),
  generatingContainer: document.getElementById('generating-container'),
  generatingText: document.getElementById('generating-text'),
  loadingContainer: document.getElementById('loading-container'),
  evaluationContainer: document.getElementById('evaluation-container'),
  scoreOverall: document.getElementById('score-overall'),
  scoreStructure: document.getElementById('score-structure'),
  scoreSpecificity: document.getElementById('score-specificity'),
  scoreOpinion: document.getElementById('score-opinion'),
  scoreDepth: document.getElementById('score-depth'),
  debriefText: document.getElementById('debrief-text'),
  newSessionButton: document.getElementById('new-session'),
  backButton: document.getElementById('back-to-setup'),
  modelAnswerBtn: document.getElementById('model-answer-btn'),
  modelAnswerContainer: document.getElementById('model-answer-container'),
  modelAnswerText: document.getElementById('model-answer-text')
};

function init() {
  elements.typeButtons.forEach(btn => {
    btn.addEventListener('click', () => selectType(btn));
  });
  elements.startButton.addEventListener('click', () => {
    startSession(state.selectedType);
  });

  // FIX 1: Wrap sendMessage in arrow function so the click event object
  // is not passed as the `transcript` argument, which caused [object PointerEvent]
  // to be submitted as the candidate's message instead of the textarea value.
  elements.sendButton.addEventListener('click', () => sendMessage());

  elements.evaluateButton.addEventListener('click', evaluateSession);
  elements.newSessionButton.addEventListener('click', resetToSetup);
  elements.backButton.addEventListener('click', resetToSetup);
  elements.modelAnswerBtn.addEventListener('click', async () => {
    elements.modelAnswerBtn.disabled = true;
    elements.modelAnswerBtn.textContent = 'Loading...';

    // Coach runs sequentially after Evaluator — receives scores and debrief
    // so feedback is anchored to identified weaknesses, not a generic pass
    // over the transcript. Also receives questionType for category-specific guidance.
    const coaching = await generateCoachFeedback(
      state.initialQuestion,
      state.conversationHistory,
      state.scores,
      state.selectedType
    );

    elements.modelAnswerText.innerHTML = coaching
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    elements.modelAnswerContainer.classList.remove('hidden');
    elements.modelAnswerBtn.textContent = 'Get Coaching';
    elements.modelAnswerBtn.disabled = false;
  });

  elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('mic-btn').addEventListener('click', () => {
    toggleRecording((transcript) => {
      sendMessage(transcript);
    });
  });

  setupNavigation((tab) => {
    if (tab === 'practice') {
      if (state.sessionId && !state.isEvaluated) {
        elements.inputContainer.classList.remove('hidden');
      }
    } else {
      elements.inputContainer.classList.add('hidden');
    }
  });
}

function selectType(btn) {
  elements.typeButtons.forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedType = btn.dataset.type;
  elements.startButton.disabled = false;
}

function createMessageElement(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role === 'candidate' ? 'candidate-message' : 'interviewer-message'}`;

  const labelDiv = document.createElement('div');
  labelDiv.className = 'message-label';
  labelDiv.textContent = role === 'candidate' ? 'You' : 'Interviewer';

  const contentP = document.createElement('p');
  contentP.className = 'message-content';
  contentP.textContent = content;

  messageDiv.appendChild(labelDiv);
  messageDiv.appendChild(contentP);

  return messageDiv;
}

function createTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  return indicator;
}

function addMessageToThread(role, content) {
  const messageElement = createMessageElement(role, content);
  elements.conversationThread.appendChild(messageElement);
  setTimeout(() => {
    messageElement.scrollIntoView({ behavior: 'instant', block: 'end' });
  }, 50);
}

function showTypingIndicator() {
  const existingIndicator = document.getElementById('typing-indicator');
  if (existingIndicator) return;

  const indicator = createTypingIndicator();
  elements.conversationThread.appendChild(indicator);
  setTimeout(() => {
    indicator.scrollIntoView({ behavior: 'instant', block: 'end' });
  }, 50);
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

async function startSession(type) {
  state.sessionId = null;
  state.initialQuestion = '';
  state.conversationHistory = [];
  state.isWaitingForResponse = false;
  state.isEvaluated = false;
  state.scores = null;

  elements.setupScreen.classList.add('hidden');
  elements.interviewScreen.classList.remove('hidden');

  elements.initialQuestionContainer.classList.add('hidden');
  elements.conversationThread.innerHTML = '';
  elements.evaluationContainer.classList.add('hidden');
  elements.inputContainer.classList.add('hidden');
  elements.generatingContainer.classList.remove('hidden');
  elements.generatingText.textContent = 'Generating question...';
  elements.evaluateButton.disabled = true;

  try {
    const examples = await fetchQuestionExamples(type);
    state.initialQuestion = await generateQuestion(type, examples, state.recentQuestions);
    state.recentQuestions = [...state.recentQuestions.slice(-4), state.initialQuestion];
    console.log('Generated question:', state.initialQuestion);
    state.sessionId = await createSession(type, state.initialQuestion);

    console.log('initialQuestionText element:', elements.initialQuestionText);
    elements.initialQuestionText.textContent = state.initialQuestion || 'Question failed to load';
    console.log('showing question container');
    elements.generatingContainer.classList.add('hidden');
    elements.initialQuestionContainer.classList.remove('hidden');
    elements.inputContainer.classList.remove('hidden');
    elements.messageInput.value = '';
    elements.messageInput.focus();
  } catch (error) {
    console.error('Error generating question:', error);
    showToast('Failed to generate question. Please try again.', true);
    resetToSetup();
  }
}

async function sendMessage(transcript = null) {
  const message = transcript || elements.messageInput.value.trim();
  if (!message || state.isWaitingForResponse || state.isEvaluated) {
    return;
  }

  state.isWaitingForResponse = true;
  elements.sendButton.disabled = true;
  elements.messageInput.disabled = true;

  state.conversationHistory.push({ role: 'candidate', message });
  addMessageToThread('candidate', message);
  elements.messageInput.value = '';

  try {
    await updateConversationHistory(state.sessionId, state.conversationHistory);
  } catch (error) {
    console.error('Error saving conversation:', error);
  }

  showTypingIndicator();

  try {
    const response = await getInterviewerResponse(state.initialQuestion, state.conversationHistory);

    hideTypingIndicator();

    state.conversationHistory.push({ role: 'interviewer', message: response });
    addMessageToThread('interviewer', response);

    try {
      await updateConversationHistory(state.sessionId, state.conversationHistory);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }

    const exchangeCount = state.conversationHistory.filter(e => e.role === 'candidate').length;

    if (response.includes("Thank you, that's all I have for you today")) {
      state.isWaitingForResponse = false;
      elements.sendButton.disabled = false;
      elements.messageInput.disabled = false;
      elements.evaluateButton.disabled = false;
      await evaluateSession();
      return;
    }

    if (exchangeCount >= 12) {
      elements.evaluateButton.disabled = false;
    }
  } catch (error) {
    console.error('Error getting interviewer response:', error);
    hideTypingIndicator();
    showToast('Failed to get interviewer response. Please try again.', true);
  }

  state.isWaitingForResponse = false;
  elements.sendButton.disabled = false;
  elements.messageInput.disabled = false;
  elements.messageInput.focus();
}

async function evaluateSession() {
  if (state.conversationHistory.length === 0) {
    showToast('Please have a conversation before evaluating.', true);
    return;
  }

  state.isEvaluated = true;
  elements.messageInput.disabled = true;
  elements.sendButton.disabled = true;
  elements.evaluateButton.disabled = true;
  elements.loadingContainer.classList.remove('hidden');

  try {
    state.scores = await evaluateInterview(state.initialQuestion, state.conversationHistory, state.selectedType);

    await saveEvaluation(state.sessionId, state.selectedType, state.scores, state.conversationHistory);

    elements.scoreOverall.textContent = `${state.scores.overall}/10`;
    elements.scoreStructure.textContent = `${state.scores.structure}/10`;
    elements.scoreSpecificity.textContent = `${state.scores.specificity}/10`;
    elements.scoreOpinion.textContent = `${state.scores.opinion_clarity}/10`;
    elements.scoreDepth.textContent = `${state.scores.depth_under_pressure}/10`;
    elements.debriefText.textContent = state.scores.debrief;

    elements.loadingContainer.classList.add('hidden');
    elements.inputContainer.classList.add('hidden');
    elements.evaluationContainer.classList.remove('hidden');
  } catch (error) {
    console.error('Error evaluating interview:', error);
    elements.loadingContainer.classList.add('hidden');

    if (error.rawResponse) {
      elements.debriefText.textContent = `Raw API response (JSON parse failed):\n\n${error.rawResponse}`;
      elements.scoreOverall.textContent = '-';
      elements.scoreStructure.textContent = '-';
      elements.scoreSpecificity.textContent = '-';
      elements.scoreOpinion.textContent = '-';
      elements.scoreDepth.textContent = '-';
      elements.inputContainer.classList.add('hidden');
      elements.evaluationContainer.classList.remove('hidden');
    } else {
      showToast('Failed to evaluate interview. Please try again.', true);
      state.isEvaluated = false;
      elements.messageInput.disabled = false;
      elements.sendButton.disabled = false;
    }
  }
}

function resetToSetup() {
  console.log('resetToSetup called', new Error().stack);
  state.selectedType = null;
  state.sessionId = null;
  state.initialQuestion = '';
  state.conversationHistory = [];
  state.isWaitingForResponse = false;
  state.isEvaluated = false;
  state.scores = null;

  elements.typeButtons.forEach(b => b.classList.remove('selected'));
  elements.startButton.disabled = true;
  elements.sendButton.disabled = false;
  elements.messageInput.disabled = false;
  elements.evaluateButton.disabled = false;

  elements.initialQuestionContainer.classList.add('hidden');
  elements.conversationThread.innerHTML = '';
  elements.generatingContainer.classList.add('hidden');
  elements.loadingContainer.classList.add('hidden');
  elements.evaluationContainer.classList.add('hidden');
  elements.inputContainer.classList.add('hidden');

  elements.interviewScreen.classList.add('hidden');
  elements.setupScreen.classList.remove('hidden');
}

function showToast(message, isError = false) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

init();