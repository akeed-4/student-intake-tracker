/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class SplashScreenComponent {
  readonly translationService = inject(TranslationService);
}