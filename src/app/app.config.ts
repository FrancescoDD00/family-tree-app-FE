import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { routes } from './app.routes';

class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) { }

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`./i18n/${lang}.json`);
  }
}

export function httpLoaderFactory(http: HttpClient) {
  return new CustomTranslateLoader(http);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient],
      },
    })
  ]
};