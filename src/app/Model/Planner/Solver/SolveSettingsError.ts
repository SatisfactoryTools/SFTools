/** A plan the user can fix in its settings - shown as-is, unlike unexpected errors. */
export class SolveSettingsError extends Error
{

	public constructor(message: string)
	{
		super(message);
		this.name = 'SolveSettingsError';
	}

}
