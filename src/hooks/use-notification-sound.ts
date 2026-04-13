const beep = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available
  }
};

const urgentAlarm = () => {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Three rapid ascending tones for urgency
    const tones = [
      { freq: 880, start: 0, dur: 0.15 },
      { freq: 1100, start: 0.18, dur: 0.15 },
      { freq: 1320, start: 0.36, dur: 0.25 },
    ];

    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.setValueAtTime(0.4, now + start);
      gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });

    // Repeat pattern after a short pause
    setTimeout(() => {
      try {
        const ctx2 = new AudioContext();
        const now2 = ctx2.currentTime;
        const tones2 = [
          { freq: 880, start: 0, dur: 0.15 },
          { freq: 1100, start: 0.18, dur: 0.15 },
          { freq: 1320, start: 0.36, dur: 0.25 },
        ];
        tones2.forEach(({ freq, start, dur }) => {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.frequency.value = freq;
          osc.type = "triangle";
          gain.gain.setValueAtTime(0.3, now2 + start);
          gain.gain.exponentialRampToValueAtTime(0.01, now2 + start + dur);
          osc.start(now2 + start);
          osc.stop(now2 + start + dur + 0.05);
        });
      } catch {}
    }, 700);
  } catch {
    // AudioContext not available
  }
};

export function useNotificationSound() {
  return { playNotification: beep, playUrgentAlert: urgentAlarm };
}
