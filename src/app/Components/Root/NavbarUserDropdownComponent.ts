import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleUser, faRightFromBracket, faRightToBracket, faUser} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {LogoutService} from '@src/Model/Auth/LogoutService';

/**
 * Navbar account entry: the user menu when signed in, otherwise a "Sign in"
 * link (registration lives on the sign-in page) that brings the user back to
 * the current page afterwards.
 */
@Component({
	selector: 'navbar-user-dropdown',
	templateUrl: './NavbarUserDropdownComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		.avatar {
			width: 22px;
			height: 22px;
			border-radius: 50%;
			object-fit: cover;
			vertical-align: -5px;
			margin-right: 0.25rem;
		}
	`],
	imports: [
		BsDropdownModule,
		FaIconComponent,
		RouterLink,
		RouterLinkActive,
	],
})
export class NavbarUserDropdownComponent
{

	public readonly faCircleUser = faCircleUser;
	public readonly faUser = faUser;
	public readonly faRightFromBracket = faRightFromBracket;
	public readonly faRightToBracket = faRightToBracket;

	public constructor(
		protected readonly authService: AuthService,
		protected readonly account: AccountProfileService,
		private readonly logoutService: LogoutService,
		protected readonly router: Router,
	)
	{
	}

	public logout(): void
	{
		this.logoutService.logout();
	}

}
