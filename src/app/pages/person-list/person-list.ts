import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Person } from '../../models/person';
import { PersonService } from '../../services/personService';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { BehaviorSubject, map, Observable, switchMap, combineLatest, startWith, Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-person-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './person-list.html',
  styleUrls: ['./person-list.scss'],
})
export class PersonListComponent implements OnInit, OnDestroy {
  private refresh$ = new BehaviorSubject<void>(undefined);
  private translate = inject(TranslateService);
  private langSub!: Subscription;

  currentLang: string = this.translate.currentLang || 'it';

  // Controllo per il filtro
  searchControl = new FormControl('');

  persons$!: Observable<Person[]>;
  filteredPersons$!: Observable<Person[]>;
  malePersons$!: Observable<Person[]>;
  femalePersons$!: Observable<Person[]>;

  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  personToEdit!: Person;
  personToEliminate!: Person;

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

  constructor(private personService: PersonService) { }

  ngOnInit() {
    this.loadPersons();

    this.langSub = this.translate.onLangChange.subscribe(event => {
      this.currentLang = event.lang;
    });
  }

  ngOnDestroy() {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }

  loadPersons() {
    this.persons$ = this.refresh$.pipe(
      switchMap(() => this.personService.getPersons())
    );

    this.filteredPersons$ = combineLatest([
      this.persons$,
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([persons, searchTerm]) => {
        if (!searchTerm) return persons;
        const term = searchTerm.toLowerCase();
        return persons.filter(p =>
          p.name.toLowerCase().includes(term) ||
          p.surname.toLowerCase().includes(term) ||
          (p.birthDate && p.birthDate.toString().includes(term))
        );
      })
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
        this.refresh$.next();
        this.showDeleteModal = false;
      },
      error: (err) => console.error(err)
    });
  }

  formatName(nameOrSurname: string): string {
    return nameOrSurname?.trim().split(/\s+/).map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ') ?? '';
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
        this.refresh$.next();
        this.personForm.reset();
      });
    }
  }

  getFullname(person: Person): string { return `${person.name} ${person.surname}`; }
  getGenderLabel(gender: string): string { return gender === 'MALE' ? 'Maschio' : 'Femmina'; }
  birthDateNotFuture(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
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
          this.refresh$.next();
          this.showEditModal = false;
        }
      });
    }
  }
}