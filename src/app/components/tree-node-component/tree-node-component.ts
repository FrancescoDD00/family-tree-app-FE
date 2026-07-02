import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Person } from '../../models/person';
import { PersonService } from '../../services/personService';
import { PersonTreeNode } from '../../models/personTreeNode';
@Component({
  selector: 'app-tree-node-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-node-component.html',
  styleUrl: './tree-node-component.scss',
})
export class TreeNodeComponent {

  @Input() node!: PersonTreeNode;


  @Input() isRoot: boolean = true;
  @Input() visited: Set<number> = new Set<number>();
  @Output() personSelected = new EventEmitter<number>();

  select(personId: number) {
    this.personSelected.emit(personId);
  }



  constructor(private personService: PersonService) { }







}