import type { AccentPreference } from './types';

class AudioEngineService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') {
      return null;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType,
    gainPeak: number,
    delaySec: number = 0,
    endFreq?: number,
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, endFreq),
        now + durationSec,
      );
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  playPlant(): void {
    this.playTone(170, 0.09, 'triangle', 0.14, 0, 260);
    this.playTone(320, 0.07, 'sine', 0.08, 0.03, 420);
  }

  playWater(): void {
    this.playTone(520, 0.08, 'sine', 0.09, 0, 740);
    this.playTone(680, 0.09, 'sine', 0.08, 0.05, 920);
  }

  playCorrect(isCritical: boolean = false): void {
    this.playTone(523.25, 0.12, 'triangle', 0.12, 0);
    this.playTone(659.25, 0.14, 'triangle', 0.12, 0.06);
    this.playTone(783.99, 0.18, 'sine', 0.13, 0.12);
    if (isCritical) {
      this.playTone(1046.5, 0.24, 'sine', 0.14, 0.18);
    }
  }

  playError(): void {
    this.playTone(210, 0.14, 'triangle', 0.11, 0, 150);
    this.playTone(160, 0.16, 'sine', 0.09, 0.07, 120);
  }

  playHarvest(): void {
    this.playTone(587.33, 0.1, 'sine', 0.11, 0);
    this.playTone(739.99, 0.12, 'sine', 0.11, 0.05);
    this.playTone(880, 0.18, 'triangle', 0.12, 0.1);
    this.playTone(1174.66, 0.24, 'sine', 0.1, 0.14);
  }

  playFever(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.2, 'triangle', 0.12, idx * 0.055);
    });
  }

  playChest(): void {
    this.playTone(440, 0.12, 'triangle', 0.12, 0);
    this.playTone(554.37, 0.14, 'triangle', 0.12, 0.07);
    this.playTone(659.25, 0.18, 'sine', 0.13, 0.14);
    this.playTone(880, 0.3, 'sine', 0.14, 0.21);
  }

  playAnimal(type: 'sheep' | 'chicken' | 'cow' | 'dog'): void {
    switch (type) {
      case 'sheep':
        // Baa~
        this.playTone(280, 0.25, 'sawtooth', 0.08, 0, 240);
        this.playTone(320, 0.22, 'triangle', 0.06, 0.02, 260);
        break;
      case 'chicken':
        // Cluck!
        this.playTone(650, 0.07, 'triangle', 0.1, 0, 800);
        this.playTone(750, 0.09, 'sine', 0.08, 0.08, 550);
        break;
      case 'cow':
        // Moo~
        this.playTone(140, 0.45, 'sawtooth', 0.09, 0, 110);
        this.playTone(145, 0.4, 'triangle', 0.07, 0.04, 115);
        break;
      case 'dog':
        // Bark / Yip!
        this.playTone(380, 0.09, 'triangle', 0.12, 0, 480);
        this.playTone(520, 0.12, 'sine', 0.1, 0.07, 300);
        break;
    }
  }

  speakWord(
    text: string,
    accent: AccentPreference = 'en-GB',
    onEnd?: () => void,
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return false;
    }

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      const voices = synth.getVoices();
      const exactMatch = voices.find((v) =>
        v.lang.toLowerCase().startsWith(accent.toLowerCase()),
      );
      const englishFallback = voices.find((v) =>
        v.lang.toLowerCase().startsWith('en'),
      );
      if (exactMatch) {
        utterance.voice = exactMatch;
      } else if (englishFallback) {
        utterance.voice = englishFallback;
      }

      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();

      synth.speak(utterance);
      return true;
    } catch {
      onEnd?.();
      return false;
    }
  }

  isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  listenForSpeech(
    accent: AccentPreference,
    onResult: (transcript: string) => void,
    onError: (reason: string) => void,
  ): (() => void) | null {
    if (typeof window === 'undefined') {
      onError('Speech recognition unavailable');
      return null;
    }

    type SpeechRecognitionInstance = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: ((ev: { error?: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const RecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      onError('Trình duyệt chưa hỗ trợ nhận diện giọng nói.');
      return null;
    }

    try {
      const recognition = new RecognitionCtor();
      recognition.lang = accent;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      let settled = false;
      recognition.onresult = (event) => {
        if (settled) return;
        settled = true;
        const firstAlt = event.results?.[0]?.[0]?.transcript ?? '';
        onResult(firstAlt.trim());
      };

      recognition.onerror = (event) => {
        if (settled) return;
        settled = true;
        onError(event.error ?? 'mic-error');
      };

      recognition.onend = () => {
        if (!settled) {
          settled = true;
          onError('no-speech');
        }
      };

      recognition.start();
      return () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      };
    } catch {
      onError('Không thể kích hoạt micro.');
      return null;
    }
  }
}

export const AudioEngine = new AudioEngineService();
