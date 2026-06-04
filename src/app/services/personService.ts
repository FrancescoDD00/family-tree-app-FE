import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Person } from '../models/person';

@Injectable({
  providedIn: 'root',
})
export class PersonService {

  private apiUrl = 'http://localhost:8080/api/persons'; // URL del backend
  private http = inject(HttpClient);
  //constructor(private http: HttpClient) { }

  updatePerson(updatedPerson: Person): Observable<Person> {
    return this.http.patch<Person>(`${this.apiUrl}/${updatedPerson.id}`, updatedPerson)
  }

  getPerson(id: number): Observable<Person> {
    return this.http.get<Person>(`${this.apiUrl}/${id}`);
  }

  getParents(id: number): Observable<Person[]> {
    return this.http.get<Person[]>(`${this.apiUrl}/${id}/parents`);
  }

  getChildrens(id: number): Observable<Person[]> {
    return this.http.get<Person[]>(`${this.apiUrl}/${id}/children`);
  }

  getSiblings(id: number): Observable<Person[]> {
    return this.http.get<Person[]>(`${this.apiUrl}/${id}/siblings`);
  }

  getPersons(): Observable<Person[]> {
    return this.http.get<Person[]>(this.apiUrl);
  }

  addPerson(person: Person): Observable<Person> {
    return this.http.post<Person>(this.apiUrl, person);
  }

  deletePersonById(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getPersonTree(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/tree`);
  }
}