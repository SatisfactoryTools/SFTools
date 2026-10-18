import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

@Component({
	selector: 'auth-layout',
	templateUrl: './AuthLayoutComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			display: block;
			padding: 2.5rem 0.75rem 3rem;
		}
		.auth-card {
			width: min(440px, 100%);
			margin: 0 auto;
			box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.35);
		}
		.auth-head {
			padding: 1.5rem 1.5rem 0.5rem;
			text-align: center;
		}
		.auth-head img {
			height: 48px;
			margin-bottom: 0.75rem;
			filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
		}
		.card-body {
			padding: 1rem 1.5rem 1.5rem;
		}
	`],
})
export class AuthLayoutComponent
{

	@Input({required: true}) public title = '';
	@Input() public subtitle = '';

}
