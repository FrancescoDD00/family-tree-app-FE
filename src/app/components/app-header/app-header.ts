import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/themeService';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslatePipe, RouterOutlet],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);
  themeService = inject(ThemeService);

  currentLang: string = 'it';
  isMenuOpen = false;


  constructor() {
    this.translate.setDefaultLang('it');

    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('lang') || 'it';
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    } else {
      this.translate.use('it');
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleLanguage() {
    const nextLang = this.currentLang === 'it' ? 'en' : 'it';
    this.switchLanguage(nextLang);
  }

  switchLanguage(lang: string) {
    this.translate.use(lang);
    this.currentLang = lang;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', lang);
    }
  }
}