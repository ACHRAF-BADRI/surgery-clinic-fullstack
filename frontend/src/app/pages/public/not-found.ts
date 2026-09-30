import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { TranslatePipe } from '../../core/i18n/i18n';

@Component({
  selector: 'app-not-found',
  imports: [EmptyStateComponent, RouterLink, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <app-empty-state illustration="notfound" [title]="'notFound.title' | t" [message]="'notFound.message' | t">
        <a class="btn btn-primary" routerLink="/"><app-icon name="arrow-left" [size]="16" /> {{ 'notFound.home' | t }}</a>
        <a class="btn" routerLink="/rendez-vous">{{ 'nav.book' | t }}</a>
      </app-empty-state>
    </section>
  `,
})
export class NotFoundPage {}
