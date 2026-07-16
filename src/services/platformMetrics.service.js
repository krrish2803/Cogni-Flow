const samples = [];
const maxSamples = 100;

function recordResponse({ path, method, statusCode, durationMs }) {
  if (!path.startsWith('/api')) return;
  samples.push({ path, method, statusCode, durationMs, createdAt: Date.now() });
  if (samples.length > maxSamples) samples.shift();
}

function health() {
  const durations = samples.map(sample => sample.durationMs);
  const successful = samples.filter(sample => sample.statusCode < 500).length;
  return {
    trackedRequests: samples.length,
    averageApiResponseMs: durations.length ? Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length) : 0,
    apiSuccessRate: samples.length ? Math.round((successful / samples.length) * 100) : 100
  };
}

module.exports = { recordResponse, health };
