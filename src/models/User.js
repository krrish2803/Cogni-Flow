const mongoose = require('mongoose'); const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 }, email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false }, role: { type: String, enum: ['student', 'educator', 'admin'], default: 'student', index: true },
  avatar: String, learningPreferences: { pace: { type: String, enum: ['gentle', 'balanced', 'challenging'], default: 'balanced' }, strictness: { type: Number, min: 1, max: 5, default: 3 } },
  targetSubjects: [String], currentLevel: { type: String, default: 'beginner' }, onboardingCompleted: { type: Boolean, default: false }, passwordChangedAt: Date, passwordResetTokenHash: String, passwordResetExpiresAt: Date
}, { timestamps: true, toJSON: { transform: (_, ret) => { delete ret.password; return ret; } } });
userSchema.pre('save', async function(next) { if (!this.isModified('password')) return next(); this.password = await bcrypt.hash(this.password, 12); next(); });
userSchema.methods.comparePassword = function(password) { return bcrypt.compare(password, this.password); };
module.exports = mongoose.model('User', userSchema);
