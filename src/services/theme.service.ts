/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, signal, effect, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  theme = signal<'light' | 'dark'>('dark');

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);

    // Effect to apply the theme attribute to the html element
    effect(() => {
      this.renderer.setAttribute(document.documentElement, 'data-theme', this.theme());
    });
  }

  toggleTheme(): void {
    this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.theme.set(theme);
  }
}
