import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private themeSignal = signal<Theme>('light');
    private platformId = inject(PLATFORM_ID);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            const saved = localStorage.getItem('theme') as Theme | null;
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initial = saved ?? (prefersDark ? 'dark' : 'light');
            this.setTheme(initial);
        }
    }

    get theme() {
        return this.themeSignal.asReadonly();
    }

    toggle() {
        this.setTheme(this.themeSignal() === 'light' ? 'dark' : 'light');
    }

    private setTheme(theme: Theme) {
        this.themeSignal.set(theme);
        if (isPlatformBrowser(this.platformId)) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        }
    }
}
