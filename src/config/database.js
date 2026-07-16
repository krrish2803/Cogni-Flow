const mongoose = require('mongoose');
const env = require('./env');
const connectDatabase = () => mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
module.exports = connectDatabase;
