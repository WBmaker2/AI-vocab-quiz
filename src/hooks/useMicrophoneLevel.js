import { useEffect, useState } from "react";
import { computeMicrophoneLevel } from "../utils/microphoneLevel.js";

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext || window.webkitAudioContext || null;
}

export function useMicrophoneLevel(active) {
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return undefined;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("microphone-level-unsupported");
      return undefined;
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      setError("microphone-level-unsupported");
      return undefined;
    }

    let cancelled = false;
    let stream = null;
    let context = null;
    let animationId = 0;
    setError("");

    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        context = new AudioContextConstructor();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const bytes = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (cancelled) {
            return;
          }

          analyser.getByteTimeDomainData(bytes);
          setLevel(computeMicrophoneLevel(bytes));
          animationId = window.requestAnimationFrame(tick);
        };

        tick();
      } catch {
        if (!cancelled) {
          setError("microphone-level-unavailable");
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;

      if (animationId) {
        window.cancelAnimationFrame(animationId);
      }

      stream?.getTracks().forEach((track) => track.stop());
      context?.close().catch(() => {});
      setLevel(0);
    };
  }, [active]);

  return { level, error };
}
