import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleUser, faRightFromBracket, faRightToBracket, faUser, faUserPlus} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AuthService} from '@src/Model/Auth/AuthService';
import {AuthApiService} from '@src/Model/API/AuthApiService';

@Component({
	selector: 'navbar-user-dropdown',
	templateUrl: './NavbarUserDropdownComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		BsDropdownModule,
		FaIconComponent,
		RouterLink,
	],
})
export class NavbarUserDropdownComponent
{

	public readonly faCircleUser = faCircleUser;
	public readonly faUser = faUser;
	public readonly faRightFromBracket = faRightFromBracket;
	public readonly faRightToBracket = faRightToBracket;
	public readonly faUserPlus = faUserPlus;

	public constructor(
		protected readonly authService: AuthService,
		private readonly authApiService: AuthApiService,
		private readonly router: Router,
	)
	{
	}

	public logout(): void
	{
		const refreshToken = this.authService.getRefreshToken() ?? undefined;
		this.authApiService.logout(refreshToken).subscribe({
			next: () => this.finishLogout(),
			error: () => this.finishLogout(),
		});
	}

	private finishLogout(): void
	{
		this.authService.clearSession();
		void this.router.navigate(['/']);
	}

}
