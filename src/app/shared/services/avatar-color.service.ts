import { Injectable } from '@angular/core';

export type SoAvatarColor = 'blue' | 'green' | 'purple' | 'orange' | 'gray';

/**
 * Mirrors SmartOpsUI AvatarColorService so the same student name gets the
 * same initials and palette color in web tables and mobile screens.
 */
@Injectable({ providedIn: 'root' })
export class AvatarColorService {
  private readonly colors: SoAvatarColor[] = ['blue', 'green', 'purple', 'orange'];

  getColor(seed: unknown): SoAvatarColor {
    const value = String(seed || '').trim().toLowerCase();
    if (!value) return 'gray';

    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.colors[Math.abs(hash) % this.colors.length];
  }

  getInitials(name: unknown): string {
    const value = String(name || '').trim();
    if (!value) return 'NA';

    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
}
