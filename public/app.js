const defaultApiBase = `${window.location.origin}/api`;
const API_BASE = window.localStorage.getItem('sc_api_base') || defaultApiBase;

const session = {
  get token() { return localStorage.getItem('sc_access_token'); },
  set token(value) { value ? localStorage.setItem('sc_access_token', value) : localStorage.removeItem('sc_access_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('sc_user')); } catch { return null; } },
  set user(value) { value ? localStorage.setItem('sc_user', JSON.stringify(value)) : localStorage.removeItem('sc_user'); }
};

function hasUsableSession() {
  if (!session.token || !session.user) return false;
  try {
    const payload = JSON.parse(atob(session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

if (!hasUsableSession()) {
  session.token = null;
  session.user = null;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(session.token && { Authorization: `Bearer ${session.token}` }), ...options.headers },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    session.token = null;
    session.user = null;
  }
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  if (new URLSearchParams(window.location.search).has('debug') && payload.data?.system_info) console.info('Socratic Scaffold system info', payload.data.system_info);
  return payload.data;
}

async function authenticate(email, password, name, role = 'student') {
  const data = await api(name ? '/auth/register' : '/auth/login', { method: 'POST', body: name ? { name, email, password, role } : { email, password } });
  session.token = data.token;
  session.user = data.user;
  return data.user;
}

function homeForRole(user) {
  return ['educator', 'admin'].includes(user?.role) ? 'dashboard.html' : 'workspace.html';
}

function redirectToRoleHome() {
  if (!session.user) return;
  const page = window.location.pathname.split('/').pop();
  const destination = homeForRole(session.user);
  const isEducator = ['educator', 'admin'].includes(session.user.role);
  if ((isEducator && (page === 'workspace.html' || page === 'student-dashboard.html')) || (!isEducator && (page === 'dashboard.html' || page === 'admin-dashboard.html')) || (page === 'admin-dashboard.html' && session.user.role !== 'admin')) window.location.replace(destination);
}

function setupStudentDashboardLink() {
  if (!document.querySelector('#new-session') || session.user?.role !== 'student') return;
  const navigation = document.querySelector('.top-nav');
  const logout = document.querySelector('#logout');
  if (!navigation || !logout || document.querySelector('#student-dashboard-link')) return;
  const link = document.createElement('a');
  link.id = 'student-dashboard-link';
  link.href = 'student-dashboard.html';
  link.textContent = 'Student dashboard';
  navigation.insertBefore(link, logout);
}

function setupRoleNavigation() {
  if (!session.user) return;
  const isEducator = ['educator', 'admin'].includes(session.user.role);
  document.querySelectorAll('a[href="dashboard.html"]').forEach(link => link.hidden = !isEducator);
  document.querySelectorAll('a[href="workspace.html"]').forEach(link => link.hidden = isEducator);
  if (!isEducator) {
    const navigation = document.querySelector('.top-nav');
    const logout = document.querySelector('#logout');
    if (navigation && logout && !document.querySelector('#student-dashboard-link')) {
      const link = document.createElement('a');
      link.id = 'student-dashboard-link';
      link.href = 'student-dashboard.html';
      link.textContent = 'Student dashboard';
      navigation.insertBefore(link, logout);
    }
  }
  if (session.user.role === 'admin') {
    const navigation = document.querySelector('.top-nav');
    const logout = document.querySelector('#logout');
    if (navigation && logout && !document.querySelector('#admin-dashboard-link')) {
      const link = document.createElement('a');
      link.id = 'admin-dashboard-link';
      link.href = 'admin-dashboard.html';
      link.textContent = 'Admin panel';
      navigation.insertBefore(link, logout);
    }
  }
}

function setupTutorLoadingState() {
  const composer = document.querySelector('#composer');
  const messages = document.querySelector('#messages');
  if (!composer || !messages) return;
  const send = document.querySelector('#send');
  const removeLoader = () => { document.querySelector('#tutor-loading')?.remove(); send?.classList.remove('is-loading'); };
  composer.addEventListener('submit', () => {
    removeLoader();
    send?.classList.add('is-loading');
    const loader = document.createElement('div');
    loader.id = 'tutor-loading';
    loader.className = 'message agent tutor-loading';
    loader.textContent = 'Socratic Scaffold is checking your reasoning…';
    messages.append(loader);
    messages.scrollTop = messages.scrollHeight;
    setTimeout(removeLoader, 30000);
  }, true);
  new MutationObserver(records => {
    const receivedTutorResponse = records.some(record => [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE && node.classList.contains('agent') && !node.classList.contains('tutor-loading')));
    if (receivedTutorResponse) removeLoader();
  }).observe(messages, { childList: true });
}

function setupWorkspaceLearningTools() {
  const newSession = document.querySelector('#new-session');
  if (!newSession || session.user?.role !== 'student' || document.querySelector('#adaptive-hint-button')) return;
  const hintButton = document.createElement('button');
  hintButton.id = 'adaptive-hint-button';
  hintButton.className = 'button new-session';
  hintButton.type = 'button';
  hintButton.textContent = '✦ Get adaptive hint';
  hintButton.addEventListener('click', () => {
    const conversationId = document.querySelector('.session.active')?.dataset.id;
    if (!conversationId) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = 'Start or open a learning session first.';
      document.body.append(toast);
      setTimeout(() => toast.remove(), 3500);
      return;
    }
    const latestQuestion = [...document.querySelectorAll('.message.student')].at(-1)?.textContent.trim() || document.querySelector('#topic-title')?.textContent || 'I need help with this concept.';
    window.location.assign(`adaptive-ladder.html?conversationId=${encodeURIComponent(conversationId)}&question=${encodeURIComponent(latestQuestion)}`);
  });
  newSession.insertAdjacentElement('afterend', hintButton);

  const uploadInput = document.createElement('input');
  uploadInput.id = 'roadmap-file-input';
  uploadInput.type = 'file';
  uploadInput.accept = '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
  uploadInput.hidden = true;
  const uploadButton = document.createElement('button');
  uploadButton.id = 'roadmap-upload-button';
  uploadButton.className = 'button new-session';
  uploadButton.type = 'button';
  uploadButton.textContent = '↑ Upload syllabus & build roadmap';
  uploadButton.addEventListener('click', () => uploadInput.click());
  uploadInput.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    const conversationId = document.querySelector('.session.active')?.dataset.id;
    if (!conversationId) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = 'Start or open a learning session before uploading a syllabus.';
      document.body.append(toast);
      setTimeout(() => toast.remove(), 3500);
      uploadInput.value = '';
      return;
    }
    const messages = document.querySelector('#messages');
    const loading = document.createElement('div');
    loading.className = 'message agent tutor-loading';
    loading.textContent = `Reading ${file.name} and building your learning roadmap…`;
    messages.append(loading);
    messages.scrollTop = messages.scrollHeight;
    uploadButton.disabled = true;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('conversationId', conversationId);
      const response = await fetch(`${API_BASE}/learning/roadmap-from-file`, { method: 'POST', credentials: 'include', headers: session.token ? { Authorization: `Bearer ${session.token}` } : {}, body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Could not create a roadmap from this file.');
      const roadmap = payload.data.roadmap;
      const card = document.createElement('article');
      card.className = 'roadmap-card';
      card.innerHTML = `<div class="eyebrow">Your uploaded syllabus roadmap</div><h2>${escapeHtml(roadmap.title || 'Learning roadmap')}</h2><p>${escapeHtml(roadmap.summary || '')}</p><div class="roadmap-meta">${escapeHtml(roadmap.estimatedDuration || 'Self-paced')}</div><h3>Start here</h3><p>${escapeHtml(roadmap.firstStep || '')}</p><div class="roadmap-phases">${(roadmap.roadmap || []).map(phase => `<section><b>Phase ${escapeHtml(String(phase.phase))}: ${escapeHtml(phase.title)}</b><span>${escapeHtml(phase.goal || '')}</span><small>Topics: ${escapeHtml((phase.topics || []).join(', '))}</small><small>Practice: ${escapeHtml(phase.practice || '')}</small></section>`).join('')}</div>`;
      messages.append(card);
      if (payload.data.lessonMessage && typeof window.appendMessage === 'function') window.appendMessage('assistant', payload.data.lessonMessage, { mode: 'syllabus-lesson', checkpointQuestion: payload.data.lesson?.checkpointQuestion, expectedAction: 'answer_short' });
      messages.scrollTop = messages.scrollHeight;
    } catch (error) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = error.message;
      document.body.append(toast);
      setTimeout(() => toast.remove(), 4500);
    } finally {
      loading.remove();
      uploadInput.value = '';
      uploadButton.disabled = false;
    }
  });
  hintButton.insertAdjacentElement('afterend', uploadInput);
  hintButton.insertAdjacentElement('afterend', uploadButton);

  const practiceButton = document.createElement('button');
  practiceButton.id = 'start-practice-button';
  practiceButton.className = 'button gold new-session';
  practiceButton.type = 'button';
  practiceButton.textContent = 'Start practice →';
  const alert = document.createElement('section');
  alert.id = 'practice-alert';
  alert.className = 'practice-alert-modal';
  alert.setAttribute('aria-hidden', 'true');
  alert.innerHTML = `<article class="practice-alert-card" role="dialog" aria-modal="true" aria-label="Learning Assistant Alert"><button class="practice-alert-close" type="button" aria-label="Close alert">×</button><div class="eyebrow">🔍 Learning Assistant Alert</div><h2 id="practice-alert-title">Before your next practice task</h2><p id="practice-alert-message">Checking your recent learning patterns…</p><div class="practice-alert-lesson"><b>Quick micro-lesson · 2 minutes</b><span id="practice-alert-lesson">A focused warm-up will appear here.</span></div><div class="practice-alert-actions"><button class="button gold" type="button" id="take-micro-lesson">Take it now</button><button class="button" type="button" id="skip-micro-lesson">Skip to practice</button></div></article>`;
  document.body.append(alert);
  const closeAlert = () => { alert.classList.remove('open'); alert.setAttribute('aria-hidden', 'true'); };
  const showToast = message => { const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; document.body.append(toast); setTimeout(() => toast.remove(), 4000); };
  let currentPrediction;
  let currentConversationId;
  const appendPractice = async () => {
    closeAlert();
    const messages = document.querySelector('#messages');
    const loading = document.createElement('div');
    loading.className = 'message agent tutor-loading';
    loading.textContent = 'Preparing your practice task…';
    messages.append(loading);
    try {
      const concept = currentPrediction?.prediction?.patternDetected || document.querySelector('#topic-title')?.textContent || 'guided problem solving';
      const data = await api('/practice/generate', { method: 'POST', body: { conversationId: currentConversationId, concept, difficulty: 2, subject: 'coding' } });
      const task = data.practice;
      const card = document.createElement('article');
      card.className = 'practice-task-card';
      card.innerHTML = `<div class="eyebrow">Personalized practice</div><h3>${escapeHtml(task.concept || 'Next practice task')}</h3><p>${escapeHtml(task.prompt || '')}</p><small>${escapeHtml(task.evaluationRubric || '')}</small><a class="button gold" style="margin-top:13px" href="practice.html?practiceId=${encodeURIComponent(task._id)}">Open practice →</a>`;
      messages.append(card);
      messages.scrollTop = messages.scrollHeight;
    } catch (error) { showToast(error.message); } finally { loading.remove(); }
  };
  practiceButton.addEventListener('click', async () => {
    const conversationId = document.querySelector('.session.active')?.dataset.id;
    if (!conversationId) return showToast('Start or open a learning session before beginning practice.');
    currentConversationId = conversationId;
    practiceButton.disabled = true;
    practiceButton.textContent = 'Checking readiness…';
    try {
      currentPrediction = await api('/learning/predict-next-mistake', { method: 'POST', body: { conversationId, nextTopic: document.querySelector('#topic-title')?.textContent || 'coding practice' } });
      const prediction = currentPrediction.prediction;
      document.querySelector('#practice-alert-title').textContent = prediction.patternDetected || 'Before your next practice task';
      document.querySelector('#practice-alert-message').textContent = prediction.rootCauseReasoning?.analysis || 'Based on your recent learning evidence, take a short warm-up before this practice task.';
      document.querySelector('#practice-alert-lesson').textContent = prediction.microPractice?.prompt || prediction.intervention || 'Review the key idea, then try one small example.';
      alert.classList.add('open');
      alert.setAttribute('aria-hidden', 'false');
    } catch (error) { showToast(error.message); } finally { practiceButton.disabled = false; practiceButton.textContent = 'Start practice →'; }
  });
  document.querySelector('#take-micro-lesson').addEventListener('click', () => {
    closeAlert();
    const messages = document.querySelector('#messages');
    const microPractice = currentPrediction?.prediction?.microPractice;
    const card = document.createElement('article');
    card.className = 'practice-task-card micro-lesson-card';
    card.innerHTML = `<div class="eyebrow">2-minute micro-lesson</div><h3>Warm up before practice</h3><p>${escapeHtml(microPractice?.prompt || currentPrediction?.prediction?.intervention || '')}</p><small>Success criterion: ${escapeHtml(microPractice?.successCriterion || 'Explain the key idea in your own words.')}</small>`;
    messages.append(card);
    messages.scrollTop = messages.scrollHeight;
  });
  document.querySelector('#skip-micro-lesson').addEventListener('click', appendPractice);
  document.querySelector('.practice-alert-close').addEventListener('click', closeAlert);
  alert.addEventListener('click', event => { if (event.target === alert) closeAlert(); });
  uploadButton.insertAdjacentElement('afterend', practiceButton);
}

function prefillAdaptiveLadder() {
  if (!window.location.pathname.endsWith('adaptive-ladder.html')) return;
  const params = new URLSearchParams(window.location.search);
  const conversation = document.querySelector('#conversation');
  const question = document.querySelector('#question');
  if (conversation && params.get('conversationId')) conversation.value = params.get('conversationId');
  if (question && params.get('question')) question.value = params.get('question');
}

function setupEducatorInterventionQueue() {
  if (!document.querySelector('#empty-dashboard') || !['educator', 'admin'].includes(session.user?.role) || document.querySelector('#intervention-queue')) return;
  const section = document.createElement('section');
  section.id = 'intervention-queue';
  section.className = 'panel intervention-queue';
  section.innerHTML = '<div class="eyebrow">Teacher intervention queue</div><h2>Students needing attention.</h2><div class="queue-content">Loading learner risk signals…</div>';
  document.querySelector('#empty-dashboard').insertAdjacentElement('beforebegin', section);
  api('/dashboard/intervention-queue').then(data => {
    const rows = data.queue.slice(0, 6);
    section.querySelector('.queue-content').innerHTML = rows.length ? rows.map(item => `<article><div><b>${escapeHtml(item.student.name)}</b><span>${escapeHtml(item.reason)}</span><small>${escapeHtml(item.misconceptions.join(', ') || 'No recurring misconception recorded')}</small></div><strong>${item.riskScore}% risk · ${item.masteryProgress}% mastery</strong></article>`).join('') : '<div class="small">No student evidence is available yet.</div>';
  }).catch(error => { section.querySelector('.queue-content').textContent = error.message; });
}

function setupUniversalLogout() {
  document.addEventListener('click', async event => {
    const logout = event.target.closest('#logout');
    if (!logout) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
    session.token = null;
    session.user = null;
    window.location.replace('index.html');
  }, true);
}

function setupRoleSelection() {
  const form = document.querySelector('#auth-form');
  const nameInput = document.querySelector('#auth-name');
  const submit = document.querySelector('#auth-submit');
  if (!form || !nameInput || !submit) return;

  const roleField = document.createElement('fieldset');
  roleField.className = 'role-picker';
  roleField.innerHTML = `
    <legend>I am joining as</legend>
    <label class="role-option selected"><input type="radio" name="account-role" value="student" checked><span><b>Student</b><small>Learn with guided hints, practice, and mastery tracking.</small></span></label>
    <label class="role-option"><input type="radio" name="account-role" value="educator"><span><b>Educator</b><small>Review student learning evidence and progress dashboards.</small></span></label>`;
  submit.before(roleField);

  const updateRolePicker = () => {
    const registering = !nameInput.closest('.name-field')?.classList.contains('hidden');
    roleField.hidden = !registering;
    submit.textContent = registering ? `Create ${roleField.querySelector('input:checked').value} account →` : 'Sign in →';
  };
  roleField.addEventListener('change', () => {
    roleField.querySelectorAll('.role-option').forEach(option => option.classList.toggle('selected', option.querySelector('input').checked));
    updateRolePicker();
  });
  const observer = new MutationObserver(updateRolePicker);
  observer.observe(nameInput.closest('.name-field'), { attributes: true, attributeFilter: ['class'] });
  updateRolePicker();

  form.addEventListener('submit', async event => {
    if (event.__roleAwareAuthHandled) return;
    event.__roleAwareAuthHandled = true;
    event.preventDefault();
    event.stopImmediatePropagation();
    const registering = !nameInput.closest('.name-field')?.classList.contains('hidden');
    const email = document.querySelector('#auth-email').value.trim();
    const password = document.querySelector('#auth-password').value;
    const role = roleField.querySelector('input:checked').value;
    submit.disabled = true;
    try {
      const user = await authenticate(email, password, registering ? nameInput.value.trim() : undefined, role);
      window.location.assign(homeForRole(user));
    } catch (error) {
      submit.disabled = false;
      if (error.status === 409) document.querySelector('#switch-auth')?.click();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = error.status === 409 ? 'An account with this email already exists. Please sign in instead.' : error.message;
      document.body.append(toast);
      setTimeout(() => toast.remove(), 3500);
    }
  }, true);
}

document.addEventListener('DOMContentLoaded', () => {
  redirectToRoleHome();
  setupRoleSelection();
  setupStudentDashboardLink();
  setupRoleNavigation();
  setupTutorLoadingState();
  setupWorkspaceLearningTools();
  prefillAdaptiveLadder();
  setupEducatorInterventionQueue();
  setupUniversalLogout();
});

function escapeHtml(value = '') {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

function formatMode(mode) {
  return (mode || 'guidance').replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
