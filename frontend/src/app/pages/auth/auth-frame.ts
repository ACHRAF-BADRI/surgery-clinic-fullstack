import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../ui/icon';
import { TKey, TranslatePipe } from '../../core/i18n/i18n';

/** Auth pages frame: editorial panel + form card. */
@Component({
  selector: 'app-auth-frame',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; padding: clamp(24px, 5vw, 64px) 0; }
    .wrap {
      display: grid; max-width: 1040px; margin: 0 auto; border-radius: var(--radius-xl); overflow: hidden;
      border: 1px solid var(--border); background: var(--surface); box-shadow: var(--shadow-md);
      animation: scale-in .5s var(--ease) both;
    }
    @media (min-width: 900px) { .wrap { grid-template-columns: .9fr 1.1fr; } }
    .side {
      position: relative; overflow: hidden; display: none; padding: 44px; color: #f3ece2;
      background: radial-gradient(120% 90% at 0% 0%, #3a2e22 0%, #1f1b17 55%, #141110 100%);
    }
    @media (min-width: 900px) { .side { display: flex; flex-direction: column; justify-content: space-between; } }
    .side h2 { color: #f3ece2; font-size: 2.3rem; }
    .side p { color: #c7bcaf; margin-top: 14px; }
    .side ul { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 14px; font-size: .9rem; color: #e8dccb; }
    .side li { display: flex; gap: 12px; align-items: center; }
    .side li app-icon { color: #e6c797; }
    .ring { position: absolute; border: 1px solid rgba(230, 199, 151, .18); border-radius: 50%; }
    .r1 { width: 420px; height: 420px; right: -180px; bottom: -160px; }
    .r2 { width: 280px; height: 280px; right: -110px; bottom: -90px; animation: spin 40s linear infinite; border-style: dashed; }
    .main { padding: clamp(24px, 5vw, 52px); }
    .main h1 { font-size: clamp(2rem, 4vw, 2.6rem); }
    .sub { color: var(--text-2); margin: 8px 0 28px; }
  `,
  template: `
    <div class="container">
      <div class="wrap">
        <div class="side">
          <div>
            <span class="eyebrow" style="color: #e6c797">{{ 'auth.frame.eyebrow' | t }}</span>
            <h2 style="margin-top: 14px">{{ 'auth.frame.title' | t }}</h2>
            <p>{{ 'auth.frame.text' | t }}</p>
            <ul>
              <li><app-icon name="calendar-plus" /> {{ 'auth.frame.f1' | t }}</li>
              <li><app-icon name="message" /> {{ 'auth.frame.f2' | t }}</li>
              <li><app-icon name="shield-check" /> {{ 'auth.frame.f3' | t }}</li>
            </ul>
          </div>
          <span class="ring r1"></span><span class="ring r2"></span>
        </div>
        <div class="main">
          <h1>{{ title() | t }}</h1>
          @if (subtitle()) {
            <p class="sub">{{ subtitle()! | t }}</p>
          }
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthFrameComponent {
  readonly title = input.required<TKey>();
  readonly subtitle = input<TKey>();
}
