/** Preferences about the account itself rather than the tools - currently just the sign-in reminders. */
export interface AccountSettings
{

	/**
	 * Whether the app nudges a signed-out user towards signing in (planner
	 * prompt, home page panel). Off = the user chose to keep working without
	 * an account; the navbar sign-in button stays either way.
	 */
	readonly signInPrompts: boolean;

}
