import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss']
})
export class ToastComponent {
    private toastService = inject(ToastService);
    activeToasts = this.toastService.activeToasts;
    readonly dismissRequested = this.toastService.dismissRequested;

    dismissingToasts = signal<Set<number>>(new Set());

    constructor() {
        effect(() => {
            const id = this.dismissRequested();
            if (id !== null && !this.dismissingToasts().has(id)) {
                const newSet = new Set(this.dismissingToasts());
                newSet.add(id);
                this.dismissingToasts.set(newSet);

                setTimeout(() => {
                    this.toastService.remove(id);
                    const current = this.dismissingToasts();
                    const next = new Set(current);
                    next.delete(id);
                    this.dismissingToasts.set(next);
                }, 350);
            }
        });
    }

    onDismiss(id: number): void {
        if (!this.dismissingToasts().has(id)) {
            const newSet = new Set(this.dismissingToasts());
            newSet.add(id);
            this.dismissingToasts.set(newSet);

            setTimeout(() => {
                this.toastService.remove(id);
                const current = this.dismissingToasts();
                const next = new Set(current);
                next.delete(id);
                this.dismissingToasts.set(next);
            }, 350);
        }
    }

    getTypeColor(type: string): string {
        switch (type) {
            case 'success': return '#2ecc71';
            case 'error': return '#e74c3c';
            case 'warning': return '#f39c12';
            case 'info': return '#3498db';
            default: return '#3498db';
        }
    }

    isDismissing(id: number): boolean {
        return this.dismissingToasts().has(id);
    }
}