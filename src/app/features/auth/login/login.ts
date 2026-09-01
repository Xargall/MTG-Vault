import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      await this.authService.signInWithEmail(email, password);
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/';
      await this.router.navigateByUrl(redirectTo);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : this.translate.instant('auth.loginFailed'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async signInWithGoogle() {
    this.errorMessage.set(null);
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : this.translate.instant('auth.googleFailed'));
    }
  }

  async signInAsGuest() {
    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    try {
      await this.authService.signInAsGuest();
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/';
      await this.router.navigateByUrl(redirectTo);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : this.translate.instant('auth.demoFailed'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
