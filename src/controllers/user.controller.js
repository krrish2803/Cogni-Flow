const User = require('../models/User'); const AppError = require('../utils/AppError'); const asyncHandler = require('../utils/asyncHandler'); const { success } = require('../utils/api');
exports.profile = (req, res) => success(res, { user: req.user });
exports.updateProfile = asyncHandler(async (req, res) => { const permitted = ['name', 'avatar', 'learningPreferences', 'targetSubjects', 'currentLevel', 'onboardingCompleted']; const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => permitted.includes(key))); const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true }); success(res, { user }); });
exports.get = asyncHandler(async (req, res) => { const user = await User.findById(req.params.id); if (!user) throw new AppError('User not found', 404); success(res, { user }); });
exports.list = asyncHandler(async (req, res) => success(res, { users: await User.find().sort('-createdAt').limit(100) }));
