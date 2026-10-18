export class ImportFolderName
{

	public static forDate(date: Date): string
	{
		const pad = (value: number): string => String(value).padStart(2, '0');
		return `Import (${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())})`;
	}

}
