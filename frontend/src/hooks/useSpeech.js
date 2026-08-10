import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenCharIndex, setSpokenCharIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const ttsSupported = 'speechSynthesis' in window;
  const sttSupported = Boolean(SpeechRecognitionAPI);

  const speak = useCallback(
    (text, { onEnd } = {}) => {
      if (!ttsSupported) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpokenCharIndex(0);
      };

      utterance.onboundary = (event) => {
        setSpokenCharIndex(event.charIndex ?? 0);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpokenCharIndex(text.length);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [ttsSupported]
  );

  const cancelSpeak = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  function meterLoop() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const centered = (data[i] - 128) / 128;
      sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    setMicLevel(Math.min(1, rms * 4));
    rafRef.current = requestAnimationFrame(meterLoop);
  }

  async function startMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      meterLoop();
    } catch {
 
    }
  }

  function stopMeter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    analyserRef.current = null;
    setMicLevel(0);
  }

  const startListening = useCallback(() => {
    if (!sttSupported) return;
    setTranscript('');
    startMeter();

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript;
      }
      setTranscript(combined);
    };
    recognition.onerror = () => {
      setIsListening(false);
      stopMeter();
    };
    recognition.onend = () => {
      setIsListening(false);
      stopMeter();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [sttSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    stopMeter();
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
      stopMeter();
    };

  }, []);

  return {
    ttsSupported,
    sttSupported,
    speak,
    cancelSpeak,
    isSpeaking,
    spokenCharIndex,
    startListening,
    stopListening,
    isListening,
    micLevel,
    transcript,
    resetTranscript,
  };
}
