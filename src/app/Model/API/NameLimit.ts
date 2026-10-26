/** The API refuses longer names (its columns hold 255 characters); imported and generated names are cut to fit instead of failing the save. */
export class NameLimit
{

	public static readonly MAX_LENGTH = 255;

	public static clamp(name: string): string
	{
		const trimmed = name.trim();
		const characters = Array.from(trimmed);
		return characters.length <= NameLimit.MAX_LENGTH ? trimmed : characters.slice(0, NameLimit.MAX_LENGTH).join('').trim();
	}

}
