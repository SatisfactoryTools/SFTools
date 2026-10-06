/** Synchronous like localStorage because services read it in their constructors; the desktop files are read into memory before the app starts. */
export abstract class AppStorage
{

	public abstract getItem(key: string): string | null;

	public abstract setItem(key: string, value: string): void;

	public abstract removeItem(key: string): void;

	public abstract keys(prefix: string): string[];

}
