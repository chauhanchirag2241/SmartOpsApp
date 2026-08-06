import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { SoToastIcons, SoToastTone } from '../../shared/icons/so-icons';

export interface SoToastOptions {
  message: string;
  duration?: number;
  position?: 'top' | 'bottom' | 'middle';
  /** Maps to Ionic color + default icon. */
  tone?: SoToastTone;
  /** Override default icon for the tone (Ionicon name). */
  icon?: string;
}

/**
 * Shared toast presenter — Ionic iOS toasts with common icons.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toast = inject(ToastController);

  async show(messageOrOpts: string | SoToastOptions, tone: SoToastTone = 'default'): Promise<void> {
    const opts: SoToastOptions =
      typeof messageOrOpts === 'string' ? { message: messageOrOpts, tone } : messageOrOpts;

    const resolvedTone = opts.tone ?? tone;
    const color =
      resolvedTone === 'default' || resolvedTone === 'info' ? undefined : resolvedTone === 'danger'
        ? 'danger'
        : resolvedTone === 'warning'
          ? 'warning'
          : 'success';

    const icon = opts.icon ?? SoToastIcons[resolvedTone];

    const t = await this.toast.create({
      message: opts.message,
      duration: opts.duration ?? 2800,
      position: opts.position ?? 'bottom',
      color,
      icon,
      cssClass: 'so-toast',
    });
    await t.present();
  }

  success(message: string, duration = 2800): Promise<void> {
    return this.show({ message, duration, tone: 'success' });
  }

  error(message: string, duration = 2800): Promise<void> {
    return this.show({ message, duration, tone: 'danger' });
  }

  warning(message: string, duration = 2800): Promise<void> {
    return this.show({ message, duration, tone: 'warning' });
  }

  info(message: string, duration = 2800): Promise<void> {
    return this.show({ message, duration, tone: 'info' });
  }
}
