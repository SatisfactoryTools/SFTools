import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';

/**
 * Automated password reset is currently unavailable - the page just points
 * at the maintainer. The email-based reset flow returns when it works.
 */
@Component({
	selector: 'auth-forgot-password',
	templateUrl: './ForgotPasswordComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink],
})
export class ForgotPasswordComponent
{
}
