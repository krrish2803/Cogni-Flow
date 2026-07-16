const mongoose = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const LearningState = require('../models/LearningState');
const { MistakePattern } = require('../models/LearningRecords');
const { health } = require('../services/platformMetrics.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/api');

exports.platform = asyncHandler(async (req, res) => {
  const [students, educators, sessions, activeSessions, states, misconceptionRecords, recentSessions] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: { $in: ['educator', 'admin'] } }),
    Conversation.countDocuments(),
    Conversation.countDocuments({ status: 'active' }),
    LearningState.find().select('masteryProgress hintHistory misconceptions'),
    MistakePattern.countDocuments(),
    Conversation.find().sort('-updatedAt').limit(8).populate('userId', 'name email role').select('title topic subject masteryScore checkpointsCompleted status updatedAt userId')
  ]);
  const totalMasteryPoints = states.reduce((total, state) => total + (state.masteryProgress || 0), 0);
  const statesWithMisconceptions = states.filter(state => state.misconceptions?.length).length;
  const hintedStates = states.filter(state => state.hintHistory?.length);
  const effectiveHints = hintedStates.filter(state => state.masteryProgress >= 50).length;
  success(res, {
    overview: {
      students,
      educators,
      totalSessions: sessions,
      activeSessions,
      totalMasteryPoints: Math.round(totalMasteryPoints),
      averageMasteryScore: states.length ? Math.round(totalMasteryPoints / states.length) : 0,
      misconceptionRecords,
      misconceptionDetectionRate: states.length ? Math.round((statesWithMisconceptions / states.length) * 100) : 0,
      hintEffectivenessRate: hintedStates.length ? Math.round((effectiveHints / hintedStates.length) * 100) : 0
    },
    recentSessions: recentSessions.map(session => ({
      id: session._id,
      student: session.userId ? { name: session.userId.name, email: session.userId.email } : { name: 'Deleted student' },
      title: session.title,
      topic: session.topic || session.subject,
      masteryScore: session.masteryScore || 0,
      checkpointsCompleted: session.checkpointsCompleted || 0,
      status: session.status,
      updatedAt: session.updatedAt
    })),
    systemHealth: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'degraded',
      api: 'operational',
      uptimeSeconds: Math.round(process.uptime()),
      ...health()
    }
  });
});
