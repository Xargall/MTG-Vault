import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-invite',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './invite.html',
  styleUrl: './invite.scss',
})
export class Invite {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.nonNullable.group(
    {
      inviteCode: [this.route.snapshot.queryParamMap.get('code') ?? '', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    const { inviteCode, email, password } = this.form.getRawValue();
    let token: string;
    try {
      token = await this.authService.verifyInviteCode(inviteCode);
    } catch {
      this.errorMessage.set(this.translate.instant('auth.inviteInvalid'));
      this.isSubmitting.set(false);
      return;
    }

    try {
      await this.authService.signUpWithEmail(email, password, token);
      this.successMessage.set(this.translate.instant('auth.accountCreated'));
      setTimeout(() => this.router.navigateByUrl('/login'), 1500);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : this.translate.instant('auth.inviteInvalid'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async signUpWithGoogle() {
    const inviteCode = this.form.controls.inviteCode.value;
    if (!inviteCode) {
      this.form.controls.inviteCode.markAsTouched();
      return;
    }

    this.errorMessage.set(null);
    try {
      const token = await this.authService.verifyInviteCode(inviteCode);
      this.authService.recordPendingInviteToken(token);
      await this.authService.signInWithGoogle();
    } catch (error) {
      this.errorMessage.set(this.translate.instant('auth.inviteInvalid'));
    }
  }
}
