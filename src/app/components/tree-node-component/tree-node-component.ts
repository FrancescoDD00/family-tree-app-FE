import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Person } from '../../models/person';
import { PersonService } from '../../services/personService';
@Component({
  selector: 'app-tree-node-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-node-component.html',
  styleUrl: './tree-node-component.scss',
})
export class TreeNodeComponent implements OnInit {

  @Input() person!: Person;

  children: Person[] = [];

  constructor(private personService: PersonService) { }

  ngOnInit() {
    if (!this.person?.id) return;

    this.personService.getChildren(this.person.id)
      .subscribe(children => {
        this.children = children;
      });
  }

  getFullname(p: Person) {
    return `${p.name} ${p.surname}`;
  }

  select(person: Person) {
    this.person = person;
    this.ngOnInit(); 
  }
}