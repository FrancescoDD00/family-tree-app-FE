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
  imports: [CommonModule, FormsModule], // Rimosso TreeNodeComponent perché disegna tutto D3 nell'SVG
  templateUrl: './tree-component.html',
  styleUrl: './tree-component.scss',
})
export class TreeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<SVGElement>;

  persons$!: Observable<Person[]>;
  private selectedPersonIdSubject = new BehaviorSubject<number | null>(null);

  selectedPerson$!: Observable<Person | undefined>;
  selectedTree$!: Observable<PersonTreeNode | null | undefined>;

  selectedPersonId: number | null = null;

  // Gestione della sottoscrizione interna per D3
  private treeSubscription!: Subscription;

  constructor(private personService: PersonService) { }

  ngOnInit() {
    this.persons$ = this.personService.getPersons();

    this.selectedPerson$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => persons.find(p => p.id === id))
    );

    // Genera l'albero genealogico (Focalizzato o Completo)
    this.selectedTree$ = combineLatest([this.persons$, this.selectedPersonIdSubject]).pipe(
      map(([persons, id]) => {
        if (!persons || persons.length === 0) return null;

        const visited = new Set<number>();

        if (!id) {
          // --- CASO ALBERO COMPLETO ALL'INGRESSO ---
          // Creiamo un contenitore "Virtuale" per unire tutte le famiglie esistenti
          const globalRoot: PersonTreeNode = {
            id: -999, // Un ID convenzionale che indica il nodo virtuale
            name: 'Radice',
            surname: 'Globale',
            children: []
          };

          // Trova le persone che non hanno genitori nel sistema (i capostipiti)
          const patriarchs = persons.filter(p => !p.fatherId && !p.motherId && p.id != null);

          // Se per qualche motivo tutti hanno un genitore, prendiamo i primi elementi per non rompere il flusso
          const startingPoints = patriarchs.length > 0 ? patriarchs : persons.slice(0, 3);

          // Costruiamo l'albero discendente a partire da ogni capostipite
          globalRoot.children = startingPoints
            .map(p => this.buildTreeInFrontend(p.id!, persons, visited))
            .filter((node): node is PersonTreeNode => node !== undefined);

          return globalRoot;
        }

        // --- CASO PERSONA SELEZIONATA (Logica originale) ---
        return this.buildTreeInFrontend(id, persons, visited);
      })
    );
  }

  ngAfterViewInit() {
    // Restiamo in ascolto dei cambiamenti del tuo albero reattivo.
    // Ogni volta che cambia la persona, il tuo algoritmo buildTreeInFrontend genera un nuovo albero,
    // e noi chiediamo a D3 di cancellare il vecchio disegno e fare il repaint.
    this.treeSubscription = this.selectedTree$.subscribe(treeData => {
      if (treeData) {
        // Un piccolissimo ritardo permette ad Angular di assicurarsi che l'SVG esista nel DOM
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
    console.log("Selected person ID:", id);
    this.selectedPersonId = id; // Allinea il data-binding della select se scatenato dai click sui nodi
    this.selectedPersonIdSubject.next(id);
  }

  private clearCanvas() {
    if (this.canvas) {
      d3.select(this.canvas.nativeElement).selectAll('*').remove();
    }
  }

  // Manteniamo la tua logica ricorsiva client-side (Zero modifiche qui!)
  private buildTreeInFrontend(id: number, persons: Person[], visited: Set<number>): PersonTreeNode | undefined {
    if (visited.has(id)) return undefined;
    visited.add(id);

    const person = persons.find(p => p.id === id);
    if (!person) return undefined;
    if (person.id == null) return undefined;
    if (person.fatherId === person.id || person.motherId === person.id) return undefined;

    const node: PersonTreeNode = {
      id: person.id,
      name: person.name,
      surname: person.surname,
      father: person.fatherId ? this.buildTreeInFrontend(person.fatherId, persons, visited) : undefined,
      mother: person.motherId ? this.buildTreeInFrontend(person.motherId, persons, visited) : undefined,
      children: persons
        .filter(p => (p.fatherId === id || p.motherId === id) && p.id != null)
        .map(p => ({ id: p.id as number, name: p.name, surname: p.surname }))
    };

    return node;
  }

  getFullname(person: Person): string {
    return `${person.name} ${person.surname}`;
  }

  // --- RENDERING CORE CON D3.JS ---
  // --- RENDERING CORE CON D3.JS (COMPLETO) ---
  // --- RENDERING CORE CON D3.JS (DIREZIONE CORRETTA ALTO/BASSO) ---
  // --- RENDERING COMPLETO A DOPPIO ALBERO SPECCHEATO (CORRETTO) ---
  // --- RENDERING COMPLETO A DOPPIO ALBERO BILANCIATO (TUTTO ALLINEATO) ---
  private renderD3Tree(treeData: PersonTreeNode) {
    if (!this.canvas) return;

    const svgElement = d3.select(this.canvas.nativeElement);
    svgElement.selectAll('*').remove();

    const width = 900;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    svgElement
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const gContainer = svgElement.append('g');

    // Configurazione del sistema di Zoom & Drag di D3
    const zoomBehavior = d3.zoom<SVGElement, unknown>()
      .scaleExtent([0.3, 4]) // Esteso lo zoom minimo a 0.3x per vedere meglio l'albero completo se è grande
      .on('zoom', (event) => {
        gContainer.attr('transform', event.transform);
      });
    svgElement.call(zoomBehavior);

    let allLinks: any[] = [];
    let allNodes: any[] = [];
    const isGlobalTree = treeData.id === -999;

    if (isGlobalTree) {
      // ==========================================================
      // MODALITÀ ALBERO COMPLETO (Ingresso senza selezione)
      // ==========================================================

      // Mappiamo la gerarchia saltando il nodo radice virtuale -999, usando i suoi children come punti di partenza
      const d3Hierarchy = d3.hierarchy(treeData, (d: PersonTreeNode) => {
        // Se siamo alla radice fittizia, restituisce i capostipiti, altrimenti si muove lungo i figli ricorsivi
        if (d.id === -999) return d.children as any[];

        // Per mostrare l'albero completo dall'alto in basso, seguiamo la discendenza dei figli
        return (d.children && d.children.length > 0) ? d.children : [];
      });

      const globalLayout = d3.tree<any>().size([width - 100, height - 150]);
      globalLayout(d3Hierarchy);

      // Rimuoviamo il nodo fittizio -999 dai nodi e dai link da disegnare
      allNodes = d3Hierarchy.descendants().filter((d: any) => d.data.id !== -999);
      allLinks = d3Hierarchy.links().filter((l: any) => l.source.data.id !== -999 && l.target.data.id !== -999);

      // Spostamento iniziale per centrare l'albero completo dall'alto verso il basso
      gContainer.attr('transform', 'translate(50, 60)');

    } else {
      // ==========================================================
      // MODALITÀ FOCALIZZATA (Logica a doppio albero bilanciato)
      // ==========================================================
      const ancestorsHierarchy = d3.hierarchy(treeData, (d: PersonTreeNode) => {
        const parents = [];
        if (d.father) parents.push(d.father);
        if (d.mother) parents.push(d.mother);
        return parents;
      });

      const ancestorsLayout = d3.tree<any>().size([width - 200, 150]);
      ancestorsLayout(ancestorsHierarchy);

      ancestorsHierarchy.descendants().forEach((d: any) => {
        d.y = centerY - d.y;
      });

      const descendantsHierarchy = d3.hierarchy(treeData, (d: PersonTreeNode) => {
        return (d.children && d.children.length > 0) ? d.children : [];
      });

      const descendantsLayout = d3.tree<any>().size([width - 200, 150]);
      descendantsLayout(descendantsHierarchy);

      descendantsHierarchy.descendants().forEach((d: any) => {
        d.y = centerY + d.y;
      });

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

    // ==========================================
    // 3. APPLICAZIONE DISEGNO COMUNE (LINKS & NODES)
    // ==========================================

    // Disegno linee di parentela
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
      .style('stroke', '#408A71')
      .style('stroke-width', '2px');

    // Disegno nodi persone
    const nodes = gContainer.selectAll('.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => {
        this.selectPersonById(d.data.id);
      });

    // Cerchio grafico dinamico (Colori della tavolozza)
    nodes.append('circle')
      .attr('r', 24)
      .style('fill', (d: any) => {
        if (isGlobalTree) {
          // Nell'albero completo usiamo sfumature per generazione o un colore di base rilassante
          return d.depth === 1 ? '#285A48' : (d.depth === 2 ? '#408A71' : '#B0E4CC');
        }
        // Nell'albero focalizzato manteniamo la logica precedente
        if (d.data.id === this.selectedPersonId) return '#285A48';
        if (d.y < centerY) return '#408A71';
        return '#B0E4CC';
      })
      .style('stroke', '#091413')
      .style('stroke-width', '2.5px');

    // Scrittura testi
    nodes.append('text')
      .attr('dy', '.35em')
      .attr('y', 38)
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        const name = d.data.name || '';
        const surname = d.data.surname || '';
        const cleanName = name.replace(/undefined/g, '').trim();
        const cleanSurname = surname.replace(/undefined/g, '').trim();
        const initial = cleanSurname ? ` ${cleanSurname[0]}.` : '';
        return `${cleanName}${initial}`;
      })
      .style('font-family', 'sans-serif')
      .style('font-size', '12px')
      .style('fill', '#091413')
      .style('font-weight', 'bold');
  }
}