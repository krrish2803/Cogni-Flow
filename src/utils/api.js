const env = require('../config/env');

function componentFor(path = '') {
  if (path.includes('adaptive-hint-ladder')) return 'adaptive_hint_ladder_ui';
  if (path.includes('concept-map-update')) return 'concept_graph_ui';
  if (path.includes('predict-next-mistake')) return 'mistake_predictor_ui';
  if (path.includes('evaluate-explain-back')) return 'explain_back_rubric_ui';
  if (path.includes('roadmap-from-file')) return 'syllabus_roadmap_ui';
  if (path.includes('practice')) return 'practice_workspace_ui';
  if (path.includes('mastery')) return 'mastery_validation_ui';
  if (path.includes('analytics') || path.includes('session-replay')) return 'session_replay_ui';
  if (path.includes('dashboard')) return 'educator_dashboard_ui';
  if (path.includes('tutor')) return 'learning_workspace_ui';
  return 'api_client';
}

function systemInfo(req) {
  const path = `${req?.baseUrl || ''}${req?.path || ''}`;
  return {
    ai_provider: 'NVIDIA NIM',
    ai_model_used: env.NVIDIA_MODEL,
    gpt_5_6_used: false,
    gpt_5_6_reasoning: `GPT-5.6 is not configured for this deployment. AI inference was performed by ${env.NVIDIA_MODEL} through NVIDIA NIM.`,
    codex_generated_component: componentFor(path),
    session_id_for_feedback: req?.id || null
  };
}

const success = (res, data, status = 200, meta) => res.status(status).json({ success: true, data: { ...data, system_info: systemInfo(res.req) }, ...(meta && { meta }) });
module.exports = { success, systemInfo };
