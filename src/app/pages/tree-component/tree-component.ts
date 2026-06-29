import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Person } from '../../models/person';
import { PersonTreeNode } from '../../models/personTreeNode';
import { PersonService } from '../../services/personService';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import * as d3 from 'd3';

@Component({
  selector: 'app-tree-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tree-component.html',
  styleUrl: './tree-component.scss',
})
export class TreeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<SVGElement>;

  persons$!: Observable<Person[]>;
  selectedPerson$!: Observable<Person | undefined>;
  selectedTree$!: Observable<PersonTreeNode | null | undefined>;

  selectedPersonId: number | null = null;
  private selectedPersonIdSubject = new BehaviorSubject<number | null>(null);
  private treeSubscription!: Subscription;

  constructor(private personService: PersonService) { }

  ngOnInit() {
    this.persons$ = this.personService.getPersons();

    this.selectedPerson$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => persons.find(p => p.id === id))
    );

    this.selectedTree$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => {
        if (!persons || persons.length === 0) return null;

        if (!id) {
          const globalRoot: PersonTreeNode = {
            id: -999,
            name: 'Radice',
            surname: 'Globale',
            children: []
          };

          const personIds = new Set(persons.map(p => p.id));
          const patriarchs = persons.filter(p =>
            (!p.fatherId || !personIds.has(p.fatherId)) &&
            (!p.motherId || !personIds.has(p.motherId))
          );

          const startingPoints = patriarchs.length > 0 ? patriarchs : persons.slice(0, 3);

          globalRoot.children = startingPoints
            .map(p => this.buildTreeInFrontend(p.id!, persons, new Set<number>(), true))
            .filter((node): node is PersonTreeNode => node !== undefined);

          return globalRoot;
        }

        return this.buildTreeInFrontend(id, persons, new Set<number>(), false);
      })
    );
  }

  ngAfterViewInit() {
    this.treeSubscription = this.selectedTree$.subscribe(treeData => {
      if (treeData) {
        setTimeout(() => this.renderD3Tree(treeData), 50);
      } else {
        this.clearCanvas();
      }
    });
  }

  ngOnDestroy() {
    if (this.treeSubscription) {
      this.treeSubscription.unsubscribe();
    }
  }

  selectPersonById(id: number | null) {
    this.selectedPersonId = id;
    this.selectedPersonIdSubject.next(id);
  }

  private clearCanvas() {
    if (this.canvas) {
      d3.select(this.canvas.nativeElement).selectAll('*').remove();
    }
  }

  private buildTreeInFrontend(id: number, persons: Person[], visited: Set<number>, isGlobal: boolean): PersonTreeNode | undefined {
    if (visited.has(id)) return undefined;

    const localVisited = new Set(visited);
    localVisited.add(id);

    const person = persons.find(p => p.id === id);
    if (!person || person.id == null) return undefined;
    if (person.fatherId === person.id || person.motherId === person.id) return undefined;

    const childrenFiltered = persons.filter(p => {
      const isChild = p.fatherId === id || p.motherId === id;
      if (!isChild || p.id == null) return false;

      if (isGlobal && p.fatherId && p.motherId) {
        if (id === p.motherId) return false;
      }
      return true;
    });

    const node: PersonTreeNode = {
      id: person.id,
      name: person.name,
      surname: person.surname,
      father: !isGlobal && person.fatherId ? this.buildTreeInFrontend(person.fatherId, persons, localVisited, isGlobal) : undefined,
      mother: !isGlobal && person.motherId ? this.buildTreeInFrontend(person.motherId, persons, localVisited, isGlobal) : undefined,
      children: childrenFiltered
        .map(p => this.buildTreeInFrontend(p.id!, persons, localVisited, isGlobal))
        .filter((c): c is PersonTreeNode => c !== undefined)
    };

    return node;
  }

  getFullname(person: Person): string {
    return `${person.name} ${person.surname}`;
  }

  private renderD3Tree(treeData: PersonTreeNode) {
    if (!this.canvas) return;

    const svgElement = d3.select(this.canvas.nativeElement);
    svgElement.selectAll('*').remove();

    const width = 900;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // Distanza verticale fissa in pixel tra una generazione e la successiva
    const VERTICAL_SPACING = 150;

    svgElement
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const gContainer = svgElement.append('g');

    const zoomBehavior = d3.zoom<SVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => gContainer.attr('transform', event.transform));

    svgElement.call(zoomBehavior);

    let allLinks: any[] = [];
    let allNodes: any[] = [];
    const isGlobalTree = treeData.id === -999;

    if (isGlobalTree) {
      // --- RENDER ALBERO GLOBALE ---
      const d3Hierarchy = d3.hierarchy(treeData, (d: PersonTreeNode) => d.id === -999 ? d.children : d.children);

      // Aumentata la coordinata Y a 160 per garantire respiro verticale tra i livelli
      const globalLayout = d3.tree<any>().nodeSize([130, 160]);
      globalLayout(d3Hierarchy);

      allNodes = d3Hierarchy.descendants().filter((d: any) => d.data.id !== -999);
      allLinks = d3Hierarchy.links().filter((l: any) => l.source.data.id !== -999 && l.target.data.id !== -999);

      gContainer.attr('transform', `translate(${centerX}, 80)`);

    } else {
      // --- RENDER ALBERO FOCALIZZATO ---
      const ancestorsHierarchy = d3.hierarchy(treeData, (d: PersonTreeNode) => {
        const parents = [];
        if (d.father) parents.push(d.father);
        if (d.mother) parents.push(d.mother);
        return parents;
      });

      // Calcoliamo solo la X usando size, ignoriamo la Y passandogli 1
      const ancestorsLayout = d3.tree<any>().size([width - 200, 1]);
      ancestorsLayout(ancestorsHierarchy);
      // Forziamo la Y calcolandola sulla base della profondità (distanza esatta!)
      ancestorsHierarchy.descendants().forEach((d: any) => d.y = centerY - (d.depth * VERTICAL_SPACING));

      const descendantsHierarchy = d3.hierarchy(treeData, (d: PersonTreeNode) => d.children || []);

      const descendantsLayout = d3.tree<any>().size([width - 200, 1]);
      descendantsLayout(descendantsHierarchy);
      // Stessa operazione di distanziamento esatto per la linea di discendenza
      descendantsHierarchy.descendants().forEach((d: any) => d.y = centerY + (d.depth * VERTICAL_SPACING));

      const rootAncestor = ancestorsHierarchy.descendants().find((d: any) => d.data.id === this.selectedPersonId);
      const ancestorOffset = centerX - (rootAncestor ? rootAncestor.x! : centerX);
      ancestorsHierarchy.descendants().forEach((d: any) => d.x += ancestorOffset);

      const rootDescendant = descendantsHierarchy.descendants().find((d: any) => d.data.id === this.selectedPersonId);
      const descendantOffset = centerX - (rootDescendant ? rootDescendant.x! : centerX);
      descendantsHierarchy.descendants().forEach((d: any) => d.x += descendantOffset);

      allLinks = [...ancestorsHierarchy.links(), ...descendantsHierarchy.links()];

      const allNodesMap = new Map<string, any>();
      ancestorsHierarchy.descendants().forEach((d: any) => allNodesMap.set(d.data.id.toString(), d));
      descendantsHierarchy.descendants().forEach((d: any) => allNodesMap.set(d.data.id.toString(), d));

      const centerNode = allNodesMap.get(this.selectedPersonId!.toString());
      if (centerNode) {
        centerNode.x = centerX;
        centerNode.y = centerY;
      }
      allNodes = Array.from(allNodesMap.values());

      gContainer.attr('transform', 'translate(0, 0)');
    }

    // --- DISEGNO ELEMENTI SVG ---
    gContainer.selectAll('.link')
      .data(allLinks)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<any, any>().x((d: any) => d.x).y((d: any) => d.y))
      .style('fill', 'none')
      .style('stroke', '#408A71')
      .style('stroke-width', '2px');

    const nodes = gContainer.selectAll('.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => this.selectPersonById(d.data.id));

    nodes.append('circle')
      .attr('r', 24)
      .style('fill', (d: any) => {
        if (isGlobalTree) return d.depth === 1 ? '#285A48' : (d.depth === 2 ? '#408A71' : '#B0E4CC');
        if (d.data.id === this.selectedPersonId) return '#285A48';
        return d.y < centerY ? '#408A71' : '#B0E4CC';
      })
      .style('stroke', '#091413')
      .style('stroke-width', '2.5px');

    nodes.append('text')
      .attr('dy', '.35em')
      .attr('y', 38)
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        const name = (d.data.name || '').replace(/undefined/g, '').trim();
        const surname = (d.data.surname || '').replace(/undefined/g, '').trim();
        const initial = surname.length > 0 ? ` ${surname[0]}.` : '';
        return `${name}${initial}`;
      })
      .style('font-family', 'sans-serif')
      .style('font-size', '12px')
      .style('fill', '#091413')
      .style('font-weight', 'bold');
  }
}