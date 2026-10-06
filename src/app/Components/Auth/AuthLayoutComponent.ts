import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

@Component({
	selector: 'auth-layout',
	templateUrl: './AuthLayoutComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			display: block;
			padding: 2.5rem 0.75rem 3rem;
			background:
				radial-gradient(ellipse 60% 45% at 50% 0%, rgba(76, 155, 232, 0.18), transparent 70%);
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
			filter: drop-shadow(0 4px 12px rgba(76, 155, 232, 0.35));
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
