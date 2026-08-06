import { Component, Input, inject } from '@angular/core';
import { AvatarColorService } from '../../services/avatar-color.service';

@Component({
  selector: 'so-avatar',
  standalone: true,
  template: `
    <span
      class="so-avatar"
      [class]="'so-avatar size-' + size + ' color-' + color + ' shape-' + shape"
      [attr.aria-label]="name || 'Student'"
    >
      {{ initials }}
    </span>
  `,
  styleUrls: ['./so-avatar.component.scss'],
})
export class SoAvatarComponent {
  private readonly avatarColor = inject(AvatarColorService);

  @Input({ required: true }) name = '';
  /** Defaults to name to match SmartOpsUI's student-table color assignment. */
  @Input() seed = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() shape: 'circle' | 'rounded' = 'circle';

  get initials(): string {
    return this.avatarColor.getInitials(this.name);
  }

  get color(): string {
    return this.avatarColor.getColor(this.seed || this.name);
  }
}
