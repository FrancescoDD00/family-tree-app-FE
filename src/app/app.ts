import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';
import { AppHeader } from './components/app-header/app-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, CommonModule, AppHeader],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true
})
export class App {
  protected readonly title = signal('family-tree-app');
}
