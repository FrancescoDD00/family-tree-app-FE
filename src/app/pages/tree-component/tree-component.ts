import { Component, OnInit } from '@angular/core';
import { Person } from '../../models/person';
import { PersonService } from '../../services/personService';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TreeNodeComponent } from '../../components/tree-node-component/tree-node-component';

@Component({
  selector: 'app-tree-component',
  imports: [CommonModule, FormsModule, TreeNodeComponent],
  templateUrl: './tree-component.html',
  styleUrl: './tree-component.scss',
})
export class TreeComponent implements OnInit {

  getFullname(person: Person) {
    return person.name + " " + person.surname
  }
  constructor(private personService: PersonService) { }

  selectedPersonId: number | null = null;

  selectedPerson?: Person;
  father?: Person;
  mother?: Person;
  children: Person[] = [];
  siblings: Person[] = [];

  persons: Person[] = [];


  ngOnInit() {
    this.personService.getPersons().subscribe(data => {
      console.log("PERSONS:", data);
      this.persons = data;
    });
  }

  loadPersons() {
    this.personService.getPersons().subscribe(data => this.persons = data);
  }

  loadNode(id: number) {
    forkJoin({
      person: this.personService.getPerson(id),
      parents: this.personService.getParents(id),
      children: this.personService.getChildren(id),
      siblings: this.personService.getSiblings(id)
    }).subscribe(({ person, parents, children, siblings }) => {

      this.selectedPerson = person;

      this.father = parents.find(p => p.gender === 'MALE');
      this.mother = parents.find(p => p.gender === 'FEMALE');

      this.children = children;
      this.siblings = siblings;
    });
  }

  selectPersonById(id: number) {
    this.loadNode(id);
  }
}
