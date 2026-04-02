import { Component, computed, OnInit, signal } from '@angular/core';
import { MemeService } from './services/meme.service';
import type { Meme } from './models/meme';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnInit {
  readonly search = signal('');
  readonly memeService: MemeService;

  constructor(memeService: MemeService) {
    this.memeService = memeService;
  }

  readonly filteredMemes = computed(() => {
    const query = this.search().toLowerCase().trim();
    const memes = this.memeService.memes();
    if (!query) return memes;
    return memes.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.commands.some((c) => c.toLowerCase().includes(query)) ||
        m.tags.some((t) => t.toLowerCase().includes(query)),
    );
  });

  ngOnInit() {
    this.memeService.loadMemes();
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  play(meme: Meme) {
    this.memeService.play(meme);
  }

  isPlaying(meme: Meme): boolean {
    return this.memeService.playing() === meme.id;
  }
}
