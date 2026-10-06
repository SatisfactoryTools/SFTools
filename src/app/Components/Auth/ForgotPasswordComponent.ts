import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthLayoutComponent} from '@src/Components/Auth/AuthLayoutComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';

@Component({
	selector: 'auth-forgot-password',
	templateUrl: './ForgotPasswordComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink, AuthLayoutComponent, InfoNoteComponent],
})
export class ForgotPasswordComponent
{
}
