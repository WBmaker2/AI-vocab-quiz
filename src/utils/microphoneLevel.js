export function computeMicrophoneLevel(bytes) {
  if (!bytes || bytes.length === 0) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < bytes.length; index += 1) {
    const centered = (bytes[index] - 128) / 128;
    sum += centered * centered;
  }

  const rms = Math.sqrt(sum / bytes.length);
  return Math.min(1, Math.max(0, rms * 2.2));
}

export function describeMicrophoneLevel(level) {
  if (level < 0.05) {
    return "quiet";
  }

  if (level > 0.9) {
    return "loud";
  }

  return "good";
}
