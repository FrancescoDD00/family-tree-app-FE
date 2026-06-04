import { Component, OnInit } from '@angular/core';
import { Person } from '../../models/person';
import { PersonTreeNode } from '../../models/personTreeNode';
import { PersonService } from '../../services/personService';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TreeNodeComponent } from '../../components/tree-node-component/tree-node-component';

@Component({
  selector: 'app-tree-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TreeNodeComponent],
  templateUrl: './tree-component.html',
  styleUrl: './tree-component.scss',
})
export class TreeComponent implements OnInit {

  persons$!: Observable<Person[]>;
  private selectedPersonIdSubject = new BehaviorSubject<number | null>(null);

  selectedPerson$!: Observable<Person | undefined>;
  selectedTree$!: Observable<PersonTreeNode | null | undefined>;

  // Variabile per il databinding della select
  selectedPersonId: number | null = null;

  constructor(private personService: PersonService) { }

  ngOnInit() {
    // 1. Scarica la lista piatta dal BE una sola volta
    this.persons$ = this.personService.getPersons();

    // 2. Ricava la persona selezionata
    this.selectedPerson$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => persons.find(p => p.id === id))
    );

    // 3. Genera l'albero genealogico REATTIVO direttamente in memoria client-side
    this.selectedTree$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => {
        if (!id) return null;
        const visited = new Set<number>();
        return this.buildTreeInFrontend(id, persons, visited);
      })
    );
  }

  selectPersonById(id: number | null) {
    console.log("Selected person ID:", id);
    this.selectedPersonIdSubject.next(id);
  }

  // La logica ricorsiva ora gira sul browser dell'utente: zero impatto sul DB!
  private buildTreeInFrontend(id: number, persons: Person[], visited: Set<number>): PersonTreeNode | undefined {
    if (visited.has(id)) return undefined; // Evita cicli infiniti
    visited.add(id);

    const person = persons.find(p => p.id === id);
    if (!person) return undefined;
    if (person.id == null) return undefined;
    if (person.fatherId === person.id || person.motherId === person.id) return undefined; // Evita auto-relazioni


    const node: PersonTreeNode = {
      id: person.id,
      name: person.name,
      surname: person.surname,
      father: person.fatherId ? this.buildTreeInFrontend(person.fatherId, persons, visited) : undefined,
      mother: person.motherId ? this.buildTreeInFrontend(person.motherId, persons, visited) : undefined,
      children: persons
        .filter(p => (p.fatherId === id || p.motherId === id) && p.id != null)
        .map(p => ({ id: p.id as number, name: p.name, surname: p.surname })) // Mappa i figli come DTO leggeri
    };

    return node;
  }

  getFullname(person: Person): string {
    return `${person.name} ${person.surname}`;
  }
}