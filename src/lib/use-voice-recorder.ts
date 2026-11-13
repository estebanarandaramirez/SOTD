"use client";

import { useRef, useState } from "react";

const MAX_SECONDS = 20;

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(secs);
        if (secs >= MAX_SECONDS) stop();
      }, 200);
    } catch {
      setError("Microphone access denied.");
    }
  }

  function reset() {
    setAudioBlob(null);
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setElapsed(0);
  }

  return { recording, elapsed, audioBlob, audioUrl, error, maxSeconds: MAX_SECONDS, start, stop, reset };
}
