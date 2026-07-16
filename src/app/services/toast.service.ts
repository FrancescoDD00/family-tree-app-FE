import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toasts = signal<ToastMessage[]>([]);
    private nextId = 1;

    readonly activeToasts = this.toasts.asReadonly();
    readonly dismissRequested = signal<number | null>(null);

    constructor(private translate: TranslateService) { }

    success(messageKey: string): void {
        this.show(messageKey, 'success', 3000);
    }

    info(messageKey: string): void {
        this.show(messageKey, 'info', 3000);
    }

    warning(messageKey: string): void {
        this.show(messageKey, 'warning', 3000);
    }

    error(messageKey: string): void {
        this.show(messageKey, 'error', 5000);
    }

    remove(id: number): void {
        this.toasts.update(list => list.filter(t => t.id !== id));
    }

    private show(messageKey: string, type: ToastType, duration: number): void {
        const message = this.translate.instant(messageKey) || messageKey;
        const toast: ToastMessage = {
            id: this.nextId++,
            message,
            type,
            duration
        };

        this.toasts.update(list => [...list, toast]);

        setTimeout(() => {
            this.dismissRequested.set(toast.id);
        }, duration);
    }
}