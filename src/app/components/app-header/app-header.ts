import { Component, inject, PLATFORM_ID } from '@angular/core'; // Aggiungi PLATFORM_ID
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Aggiungi isPlatformBrowser
import { RouterModule, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslatePipe, RouterOutlet],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID); // Inietta il platformID

  currentLang: string = 'it';

  constructor() {
    this.translate.setDefaultLang('it');

    // Controlliamo se siamo nel browser prima di accedere a localStorage
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('lang') || 'it';
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    } else {
      // Fallback per il server (nessun localStorage)
      this.translate.use('it');
    }
  }

  // Aggiungi questo metodo nella tua classe AppHeader
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