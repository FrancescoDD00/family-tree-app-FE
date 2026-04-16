import { Component, OnInit } from '@angular/core';
import { Person } from '../../models/person';
import { PersonService } from '../../services/personService';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { BehaviorSubject, map, Observable, switchMap } from 'rxjs';


@Component({
  selector: 'app-person-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './person-list.html',
  styleUrls: ['./person-list.scss'],
})
export class PersonListComponent implements OnInit {
  private refresh$ = new BehaviorSubject<void>(undefined);

  persons$!: Observable<Person[]>;
  malePersons$!: Observable<Person[]>;
  femalePersons$!: Observable<Person[]>;

  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  personToEdit!: Person;

  personForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    birthDate: new FormControl<string | null>(null, this.birthDateNotFuture),
    fatherId: new FormControl<number | null>(null),
    motherId: new FormControl<number | null>(null),
    gender: new FormControl('', Validators.required)
  });

  editForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
    birthDate: new FormControl<string | null>(null),
    fatherId: new FormControl<number | null>(null),
    motherId: new FormControl<number | null>(null),
    gender: new FormControl<string>('', Validators.required)
  });
  personToEliminate!: Person;





  constructor(private personService: PersonService) { }

  ngOnInit() {
    this.loadPersons();
  }

  loadPersons() {
  this.persons$ = this.refresh$.pipe(
    switchMap(() => this.personService.getPersons())
  );

  this.malePersons$ = this.persons$.pipe(
    map(persons => persons.filter(p => p.gender === 'MALE' && p.id !== this.personToEdit?.id))
  );

  this.femalePersons$ = this.persons$.pipe(
    map(persons => persons.filter(p => p.gender === 'FEMALE' && p.id !== this.personToEdit?.id))
  );

}

  toggleShowDeleteModal(person: Person) {
    this.personToEliminate = person;
    this.showDeleteModal = true;
  }

  deletePersonById(id: number) {
    this.personService.deletePersonById(id).subscribe({
      next: () => {
        this.refresh$.next();   // 🔥 ricarica lista
        this.showDeleteModal = false;
        this.personToEliminate = undefined!;
      },
      error: (err) => console.error(err)
    });
  }

  formatName(nameOrSurname: string): string {
    if (!nameOrSurname) return '';
    return nameOrSurname
      .split(' ')
      .map(word => word.at(0)?.toLocaleUpperCase() + word.substring(1).toLocaleLowerCase())
      .join(' ');
  }


  addPerson() {
    if (this.personForm.valid) {
      const formValue = this.personForm.value;

      const newPerson: Person = {
        name: this.formatName(formValue.name!),
        surname: this.formatName(formValue.surname!),
        birthDate: formValue.birthDate!,
        fatherId: formValue.fatherId ?? undefined,
        motherId: formValue.motherId ?? undefined,
        gender: formValue.gender!
      };

      this.personService.addPerson(newPerson).subscribe(() => {
        this.refresh$.next();   // ricarica lista
        this.personForm.reset();
      });
    }
  }

  getFullname(person: Person): string {
    return `${person.name} ${person.surname}`;
  }
  getGenderLabel(gender: string): string {
    return gender === 'MALE' ? 'Maschio' : 'Femmina';
  }
  birthDateNotFuture(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null; // se è vuoto, lascia che il required lo gestisca
    const today = new Date();
    const birthDate = new Date(control.value);
    return birthDate > today ? { futureDate: true } : null;
  }



  editPerson(person: Person) {
    this.personToEdit = person;

    this.editForm.setValue({
      name: this.personToEdit.name,
      surname: this.personToEdit.surname,
      birthDate: this.personToEdit.birthDate ?? null,
      fatherId: this.personToEdit.fatherId ?? null,
      motherId: this.personToEdit.motherId ?? null,
      gender: this.personToEdit.gender ?? 'MALE'
    });

    this.showEditModal = true;
  }

  saveEdit(id: number) {
    if (this.editForm.valid) {
      const formValue = this.editForm.value;

      const updatedPerson: Person = {
        id,
        name: formValue.name!,
        surname: formValue.surname!,
        birthDate: formValue.birthDate!,
        fatherId: formValue.fatherId ?? undefined,
        motherId: formValue.motherId ?? undefined,
        gender: formValue.gender!
      };

      this.personService.updatePerson(updatedPerson).subscribe({
        next: () => {
          this.refresh$.next();   // ricarica lista dal backend
          this.showEditModal = false;
          this.editForm.reset();
        },
        error: err => console.error(err)
      });
    }
  }

}