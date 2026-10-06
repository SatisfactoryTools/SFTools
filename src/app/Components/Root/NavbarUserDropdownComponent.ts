import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleUser, faRightFromBracket, faRightToBracket, faUser} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {LogoutService} from '@src/Model/Auth/LogoutService';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

/** Offline there is no signing in or out: signing out would drop edits not yet saved to the account. */
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
		protected readonly connectivity: ConnectivityService,
	)
	{
	}

	public logout(): void
	{
		this.logoutService.logout();
	}

}
