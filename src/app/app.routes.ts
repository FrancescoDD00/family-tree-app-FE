import { Routes } from '@angular/router';
import { PersonListComponent } from './pages/person-list/person-list';
import { AboutComponent } from './pages/about-component/about-component';
import { HomeComponent } from './pages/home-component/home-component';
import { TreeComponent } from './pages/tree-component/tree-component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'persons', component: PersonListComponent },
  { path: 'tree', component: TreeComponent},
  { path: 'about', component: AboutComponent },
  { path: '**', redirectTo: '' }
];