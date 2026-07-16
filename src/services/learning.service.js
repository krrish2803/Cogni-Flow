const LearningState = require('../models/LearningState'); const Conversation = require('../models/Conversation');
async function getState(userId) { return LearningState.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { new: true, upsert: true }); }
async function updateFromTutor({ userId, conversationId, output }) {
  const state = await getState(userId); const delta = output.masteryUpdate || {}; state.masteryProgress = Math.max(0, Math.min(100, state.masteryProgress + (delta.scoreDelta || 0))); state.confidenceLevel = Math.max(0, Math.min(100, state.confidenceLevel + (delta.confidenceDelta || 0)));
  for (const concept of output.concepts || []) if (!state.weakConcepts.some(item => item.name === concept)) state.weakConcepts.push({ name: concept, score: 50 });
  for (const misconception of output.misconceptions || []) { const existing = state.misconceptions.find(item => item.description === misconception); if (existing) existing.count += 1; else state.misconceptions.push({ description: misconception, concept: output.concepts?.[0] || 'general' }); }
  await state.save();
  if (conversationId) await Conversation.findByIdAndUpdate(conversationId, { $set: { learningStateSnapshot: state.toObject() }, $inc: { checkpointsCompleted: output.mode === 'checkpoint' ? 1 : 0 } });
  return state;
}
module.exports = { getState, updateFromTutor };
