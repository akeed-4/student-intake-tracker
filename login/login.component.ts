/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  error = input<string | null>(null);
  login = output<{username: string, password: string}>();

  // Local component state
  loginUsername = signal('');
  loginPassword = signal('');

  onLoginUsernameInput(event: Event): void {
    this.loginUsername.set((event.target as HTMLInputElement).value);
  }

  onLoginPasswordInput(event: Event): void {
    this.loginPassword.set((event.target as HTMLInputElement).value);
  }

  handleLogin(): void {
    this.login.emit({ username: this.loginUsername(), password: this.loginPassword() });
  }
}
