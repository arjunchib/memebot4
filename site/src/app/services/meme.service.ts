import { Injectable, signal } from '@angular/core';
import type { Meme } from '../models/meme';

@Injectable({ providedIn: 'root' })
export class MemeService {
  readonly memes = signal<Meme[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private audio: HTMLAudioElement | null = null;
  readonly playing = signal<string | null>(null);

  async loadMemes() {
    try {
      this.loading.set(true);
      const res = await fetch('/api/memes');
      if (!res.ok) throw new Error(`Failed to fetch memes: ${res.status}`);
      const data: Meme[] = await res.json();
      this.memes.set(data);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      this.loading.set(false);
    }
  }

  play(meme: Meme) {
    if (this.audio) {
      this.audio.onended = null;
      this.audio.pause();
      this.audio = null;
    }

    if (this.playing() === meme.id) {
      this.playing.set(null);
      return;
    }

    this.audio = new Audio(meme.audioUrl);
    this.playing.set(meme.id);
    this.audio.play().catch(() => {
      this.playing.set(null);
      this.audio = null;
    });
    this.audio.onended = () => {
      this.playing.set(null);
      this.audio = null;
    };
  }
}
