import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Person } from '../../models/person';
import { PersonService } from '../../services/personService';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { BehaviorSubject, map, Observable, switchMap, combineLatest, startWith, Subscription, forkJoin, tap } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-person-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe],
  templateUrl: './person-list.html',
  styleUrls: ['./person-list.scss'],
})
export class PersonListComponent implements OnInit, OnDestroy {
  private refresh$ = new BehaviorSubject<void>(undefined);
  private translate = inject(TranslateService);
  private langSub!: Subscription;
  private toastService = inject(ToastService);

  currentLang: string = this.translate.currentLang || 'it';

  searchControl = new FormControl('');

  persons$!: Observable<Person[]>;
  filteredPersons$!: Observable<Person[]>;
  malePersons$!: Observable<Person[]>;
  femalePersons$!: Observable<Person[]>;

  private allPersons: Person[] = [];

  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  showDetailsModal: boolean = false;
  personToEdit!: Person;
  personToEliminate!: Person;
  personToView!: Person;

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

  childrenInputs: { personId: number | null }[] = [];

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
      switchMap(() => this.personService.getPersons()),
      tap(persons => { this.allPersons = persons; })
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
        this.toastService.success('PERSON_LIST.TOAST_DELETED');
      },
      error: (err) => console.error(err)
    });
  }

  formatName(nameOrSurname: string): string {
    return nameOrSurname?.trim().split(/\s+/).map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ') ?? '';
  }

  addChildInput() {
    this.childrenInputs.push({ personId: null });
  }

  removeChild(index: number) {
    this.childrenInputs.splice(index, 1);
  }

  addPerson() {
    if (this.personForm.valid) {
      const formValue = this.personForm.value;
      const gender = formValue.gender!;
      const newPerson: Person = {
        name: this.formatName(formValue.name!),
        surname: this.formatName(formValue.surname!),
        birthDate: formValue.birthDate!,
        fatherId: formValue.fatherId ?? undefined,
        motherId: formValue.motherId ?? undefined,
        gender
      };
      this.personService.addPerson(newPerson).subscribe(created => {
        this.refresh$.next();

        const validChildrenIds = this.childrenInputs
          .filter(c => c.personId != null)
          .map(c => c.personId!);

        if (validChildrenIds.length > 0) {
          const updateObservables = validChildrenIds.map(childId => {
            const parentField = gender === 'MALE' ? 'fatherId' as const : 'motherId' as const;
            return this.personService.getPerson(childId).pipe(
              switchMap(child => {
                if (!child) return [];
                const updatedChild: Person = { ...child, [parentField]: created.id };
                return this.personService.updatePerson(updatedChild);
              })
            );
          });

          forkJoin(updateObservables).subscribe(() => {
            this.refresh$.next();
          });
        }

        this.personForm.reset();
        this.childrenInputs = [];
        this.showAddModal = false;
        this.toastService.success('PERSON_LIST.TOAST_ADDED');
      });
    }
  }

  getFullname(person: Person): string { return `${person.name} ${person.surname}`; }

  getFullnameWithContext(person: Person): string {
    const father = person.fatherId != null
      ? this.allPersons.find(p => p.id === person.fatherId)
      : undefined;
    const mother = person.motherId != null
      ? this.allPersons.find(p => p.id === person.motherId)
      : undefined;

    const base = `${person.name} ${person.surname}`;

    const fatherLabel = father
      ? this.getFullname(father)
      : (person.fatherId != null ? `ID: ${person.fatherId}` : null);
    const motherLabel = mother
      ? this.getFullname(mother)
      : (person.motherId != null ? `ID: ${person.motherId}` : null);

    const contextParts: string[] = [];
    if (fatherLabel) contextParts.push(`padre: ${fatherLabel}`);
    if (motherLabel) contextParts.push(`madre: ${motherLabel}`);

    return contextParts.length > 0
      ? `${base} (${contextParts.join(', ')})`
      : base;
  }

  getGenderLabel(gender: string): string {
    return gender === 'MALE'
      ? this.translate.instant('PERSON_LIST.MALE')
      : this.translate.instant('PERSON_LIST.FEMALE');
  }
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

  showPersonDetail(person: Person) {
    this.personToView = person;
    this.showDetailsModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
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
          this.toastService.success('PERSON_LIST.TOAST_UPDATED');
        }
      });
    }
  }
}