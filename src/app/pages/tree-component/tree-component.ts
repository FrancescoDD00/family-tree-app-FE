import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect, HostListener, signal } from '@angular/core';
import { Person } from '../../models/person';
import { PersonTreeNode } from '../../models/personTreeNode';
import { PersonService } from '../../services/personService';
import { ThemeService } from '../../services/themeService';
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
  private themeService = inject(ThemeService);
  private treeDataCache: PersonTreeNode | null = null;

  dropdownOpen = signal(false);

  constructor(private personService: PersonService) {
    effect(() => {
      this.themeService.theme();
      if (this.treeDataCache) {
        setTimeout(() => this.renderD3Tree(this.treeDataCache!), 50);
      }
    });
  }

  toggleDropdown(): void {
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  selectPerson(id: number | null | undefined): void {
    const normalized: number | null = id == null ? null : id;
    this.selectedPersonId = normalized;
    this.selectedPersonIdSubject.next(normalized);
    this.closeDropdown();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select')) {
      this.closeDropdown();
    }
  }

  ngOnInit() {
    this.persons$ = this.personService.getPersons();

    this.selectedPerson$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => persons.find(p => p.id === id))
    );

    this.selectedTree$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => {
        if (!persons || persons.length === 0) return null;

        if (!id) {
          const personIds = new Set(persons.map(p => p.id));
          const roots = persons.filter(p =>
            (!p.fatherId || !personIds.has(p.fatherId)) &&
            (!p.motherId || !personIds.has(p.motherId))
          );

          const root: PersonTreeNode = {
            id: -999,
            name: 'Albero Genealogico',
            surname: '',
            children: []
          };

          for (const rootPerson of roots.slice(0, 10)) {
            const childNodes = persons
              .filter(p => p.fatherId === rootPerson.id || p.motherId === rootPerson.id)
              .map(p => ({
                id: p.id!,
                name: p.name,
                surname: p.surname,
                children: [] as PersonTreeNode[]
              }));

            (root.children as PersonTreeNode[]).push({
              id: rootPerson.id!,
              name: rootPerson.name,
              surname: rootPerson.surname,
              children: childNodes
            });
          }

          return root;
        }

        return this.buildFullTree(id, persons, new Set<number>(), 0, 4);
      })
    );
  }

  ngAfterViewInit() {
    this.treeSubscription = this.selectedTree$.subscribe(treeData => {
      if (treeData) {
        this.treeDataCache = treeData;
        setTimeout(() => this.renderD3Tree(treeData), 50);
      } else {
        this.clearCanvas();
        this.treeDataCache = null;
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

  private buildFullTree(
    id: number,
    persons: Person[],
    visited: Set<number>,
    depth: number,
    maxDepth: number
  ): PersonTreeNode | undefined {
    if (visited.has(id) || depth > maxDepth) return undefined;

    const localVisited = new Set(visited);
    localVisited.add(id);

    const person = persons.find(p => p.id === id);
    if (!person || person.id == null) return undefined;
    if (person.fatherId === person.id || person.motherId === person.id) return undefined;

    const children = persons
      .filter(p => (p.fatherId === id || p.motherId === id) && p.id != null)
      .map(p => this.buildFullTree(p.id!, persons, localVisited, depth + 1, maxDepth))
      .filter((c): c is PersonTreeNode => c !== undefined);

    const node: PersonTreeNode = {
      id: person.id,
      name: person.name,
      surname: person.surname,
      father: person.fatherId ? this.buildFullTree(person.fatherId, persons, localVisited, depth + 1, maxDepth) : undefined,
      mother: person.motherId ? this.buildFullTree(person.motherId, persons, localVisited, depth + 1, maxDepth) : undefined,
      children
    };

    return node;
  }

  getFullname(person: Person): string {
    return `${person.name} ${person.surname}`;
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private toD3Hierarchy(node: PersonTreeNode, centerId: number): d3.HierarchyNode<any> {
    const addedIds = new Set<number>();
    const rootData: any = {
      id: node.id,
      label: this.makeLabel(node),
      rel: 'IO',
      isCenter: true,
      children: []
    };
    addedIds.add(centerId);

    const fatherSiblings = new Set<number>();
    const motherSiblings = new Set<number>();

    if (node.father?.children) {
      for (const sib of node.father.children) {
        if (sib.id !== centerId && !addedIds.has(sib.id)) {
          addedIds.add(sib.id);
          fatherSiblings.add(sib.id);
          rootData.children.push(this.buildDescendantBranch(sib, 'FRATELLO/SORELLA'));
        }
      }
    }
    if (node.mother?.children) {
      for (const sib of node.mother.children) {
        if (sib.id !== centerId && !addedIds.has(sib.id)) {
          addedIds.add(sib.id);
          motherSiblings.add(sib.id);
          rootData.children.push(this.buildDescendantBranch(sib, 'FRATELLO/SORELLA'));
        }
      }
    }

    if (node.father) {
      rootData.children.push(this.buildSideBranch(node.father, 'PADRE', addedIds, true, fatherSiblings, node.father.id));
    }
    if (node.mother) {
      rootData.children.push(this.buildSideBranch(node.mother, 'MADRE', addedIds, false, motherSiblings, node.mother.id));
    }

    if (node.children) {
      for (const child of node.children) {
        rootData.children.push(this.buildDescendantBranch(child, 'FIGLIO/A'));
      }
    }

    return d3.hierarchy(rootData);
  }

  private makeLabel(pn: PersonTreeNode): string {
    const name = (pn.name || '').replace(/undefined/g, '').trim();
    const surname = (pn.surname || '').replace(/undefined/g, '').trim();
    const initial = surname.length > 0 ? ` ${surname[0]}.` : '';
    return `${name}${initial}`;
  }

  private buildSideBranch(
    pn: PersonTreeNode,
    rel: string,
    addedIds: Set<number>,
    isFatherSide: boolean,
    siblingsOfParent: Set<number>,
    parentIdToExclude: number
  ): any {
    const data: any = {
      id: pn.id,
      label: this.makeLabel(pn),
      rel,
      isCenter: false,
      children: []
    };
    addedIds.add(pn.id);

    if (pn.father) {
      data.children.push(this.buildGrandparentNode(pn.father, 'NONNO', addedIds, isFatherSide, parentIdToExclude));
    }
    if (pn.mother) {
      data.children.push(this.buildGrandparentNode(pn.mother, 'NONNA', addedIds, isFatherSide, parentIdToExclude));
    }

    return data;
  }

  private buildGrandparentNode(
    pn: PersonTreeNode,
    rel: string,
    addedIds: Set<number>,
    isFatherSide: boolean,
    excludeParentId: number
  ): any {
    const data: any = {
      id: pn.id,
      label: this.makeLabel(pn),
      rel,
      isCenter: false,
      children: []
    };
    addedIds.add(pn.id);

    if (pn.father) {
      data.children.push(this.buildGrandparentNode(pn.father, 'BISNONNO', addedIds, isFatherSide, pn.id));
    }
    if (pn.mother) {
      data.children.push(this.buildGrandparentNode(pn.mother, 'BISNONNA', addedIds, isFatherSide, pn.id));
    }

    // Add uncles/aunts (siblings of the parent node)
    if (pn.children) {
      for (const child of pn.children) {
        if (child.id !== excludeParentId && !addedIds.has(child.id)) {
          addedIds.add(child.id);
          const childRel = isFatherSide ? 'ZIO' : 'ZIA';
          const childBranch: any = {
            id: child.id,
            label: this.makeLabel(child),
            rel: childRel,
            isCenter: false,
            children: []
          };

          if (child.children) {
            for (const cousin of child.children) {
              if (!addedIds.has(cousin.id)) {
                addedIds.add(cousin.id);
                childBranch.children.push({
                  id: cousin.id,
                  label: this.makeLabel(cousin),
                  rel: 'CUGINO/A',
                  isCenter: false,
                  children: []
                });
              }
            }
          }

          data.children.push(childBranch);
        }
      }
    }

    return data;
  }

  private buildDescendantBranch(pn: PersonTreeNode, rel: string): any {
    const data: any = {
      id: pn.id,
      label: this.makeLabel(pn),
      rel,
      isCenter: false,
      children: []
    };

    if (pn.children) {
      for (const child of pn.children) {
        data.children.push(this.buildDescendantBranch(child, 'NIPOTE'));
      }
    }

    return data;
  }

  private renderD3Tree(treeData: PersonTreeNode) {
    if (!this.canvas) return;

    const svgElement = d3.select(this.canvas.nativeElement);
    svgElement.selectAll('*').remove();

    const width = 900;
    const height = 600;

    svgElement
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const gContainer = svgElement.append('g');

    const zoomBehavior = d3.zoom<SVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => gContainer.attr('transform', event.transform));

    svgElement.call(zoomBehavior);

    const surfaceHover = this.getCssVar('--surface-hover');
    const surface = this.getCssVar('--surface');
    const surfaceDark = this.getCssVar('--surface-dark');
    const textPrimary = this.getCssVar('--text-primary');

    const isGlobalTree = treeData.id === -999;

    if (isGlobalTree) {
      const d3Hierarchy = d3.hierarchy(treeData, (d: any) => d.id === -999 ? d.children : d.children || []);
      const leafCount = d3Hierarchy.leaves().length;
      const nodeSizeX = Math.max(80, Math.min(180, (width - 100) / Math.max(leafCount, 1)));
      const globalLayout = d3.tree<any>().nodeSize([nodeSizeX, 160]);
      globalLayout(d3Hierarchy);

      const allNodes = d3Hierarchy.descendants().filter((d: any) => d.data.id !== -999);
      const allLinks = d3Hierarchy.links().filter((l: any) => l.source.data.id !== -999 && l.target.data.id !== -999);

      gContainer.attr('transform', `translate(${width / 2}, 60)`);

      gContainer.selectAll('.link')
        .data(allLinks)
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical<any, any>().x((d: any) => d.x).y((d: any) => d.y))
        .style('fill', 'none')
        .style('stroke', surfaceHover)
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
        .attr('r', 22)
        .style('fill', (d: any) => d.depth === 1 ? surfaceDark : surfaceHover)
        .style('stroke', textPrimary)
        .style('stroke-width', '2.5px');

      nodes.append('text')
        .attr('dy', '.35em')
        .attr('y', 36)
        .attr('text-anchor', 'middle')
        .text((d: any) => {
          const name = (d.data.name || '').replace(/undefined/g, '').trim();
          const surname = (d.data.surname || '').replace(/undefined/g, '').trim();
          const initial = surname.length > 0 ? ` ${surname[0]}.` : '';
          return `${name}${initial}`;
        })
        .style('font-family', 'sans-serif')
        .style('font-size', '11px')
        .style('fill', textPrimary)
        .style('font-weight', 'bold');

      return;
    }

    const hierarchyRoot = this.toD3Hierarchy(treeData, treeData.id);
    const totalNodes = hierarchyRoot.descendants().length;

    const nodeSizeX = Math.max(90, Math.min(220, (width - 80) / Math.max(totalNodes, 2)));
    const nodeSizeY = 160;

    const treeLayout = d3.tree<any>().nodeSize([nodeSizeX, nodeSizeY]);
    treeLayout(hierarchyRoot);

    const allNodes = hierarchyRoot.descendants();
    const allLinks = hierarchyRoot.links();

    const minX = d3.min(allNodes, (d: any) => d.x) || 0;
    const maxX = d3.max(allNodes, (d: any) => d.x) || width;
    const treeWidth = maxX - minX;
    const offsetX = (width - treeWidth) / 2 - minX;

    gContainer.attr('transform', `translate(${offsetX}, 40)`);

    gContainer.selectAll('.link')
      .data(allLinks)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y)
      )
      .style('fill', 'none')
      .style('stroke', surfaceHover)
      .style('stroke-width', '2px')
      .style('opacity', 0.7);

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
        if (d.data.isCenter) return surfaceDark;
        const rel = d.data.rel || '';
        if (['PADRE', 'NONNO', 'BISNONNO'].includes(rel)) return surfaceHover;
        return surface;
      })
      .style('stroke', textPrimary)
      .style('stroke-width', '2.5px');

    nodes.append('text')
      .attr('dy', '.35em')
      .attr('y', 38)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.label || '')
      .style('font-family', 'sans-serif')
      .style('font-size', '11px')
      .style('fill', textPrimary)
      .style('font-weight', 'bold');

    nodes.append('text')
      .attr('dy', '.35em')
      .attr('y', -32)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.rel || '')
      .style('font-family', 'sans-serif')
      .style('font-size', '9px')
      .style('fill', surfaceHover)
      .style('font-weight', '600')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '1px');
  }
}