import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';

@Component({
  selector: 'app-not-found',
  imports: [EmptyStateComponent, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <app-empty-state illustration="notfound" title="Cette page s'est égarée"
        message="La page que vous cherchez n'existe pas ou a été déplacée. Revenons en terrain connu.">
        <a class="btn btn-primary" routerLink="/"><app-icon name="arrow-left" [size]="16" /> Retour à l'accueil</a>
        <a class="btn" routerLink="/rendez-vous">Prendre rendez-vous</a>
      </app-empty-state>
    </section>
  `,
})
export class NotFoundPage {}
