import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const SHARED_FILE = 'state.json';

const OWN_FILES: {prefix: string; folder: string | null}[] = [
	{prefix: 'sftools.plans.', folder: 'plans'},
	{prefix: 'sftools.offline.', folder: 'offline'},
];

const SAFE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

export class FileAppStorage extends AppStorage
{

	private readonly values = new Map<string, string>();
	private readonly writing = new Set<string>();
	private readonly dirty = new Set<string>();

	public constructor(private readonly bridge: DesktopBridge)
	{
		super();
		for (const [file, contents] of Object.entries(bridge.info.storage)) {
			this.readFile(file, contents);
		}
	}

	public getItem(key: string): string | null
	{
		return this.values.get(key) ?? null;
	}

	public setItem(key: string, value: string): void
	{
		if (this.values.get(key) === value) {
			return;
		}
		this.values.set(key, value);
		this.scheduleWrite(this.fileOf(key));
	}

	public removeItem(key: string): void
	{
		if (!this.values.delete(key)) {
			return;
		}
		this.scheduleWrite(this.fileOf(key));
	}

	public keys(prefix: string): string[]
	{
		return [...this.values.keys()].filter(key => key.startsWith(prefix));
	}

	private readFile(file: string, contents: string): void
	{
		if (file === SHARED_FILE) {
			try {
				for (const [key, value] of Object.entries(JSON.parse(contents) as Record<string, string>)) {
					this.values.set(key, value);
				}
			} catch (error) {
				console.error(`Could not read ${file}:`, error);
			}
			return;
		}
		if (file === 'settings.json') {
			this.values.set('sftools.settings', contents);
			return;
		}
		for (const {prefix, folder} of OWN_FILES) {
			if (folder !== null && file.startsWith(`${folder}/`)) {
				this.values.set(prefix + file.slice(folder.length + 1, -'.json'.length), contents);
				return;
			}
		}
	}

	private fileOf(key: string): string
	{
		if (key === 'sftools.settings') {
			return 'settings.json';
		}
		for (const {prefix, folder} of OWN_FILES) {
			const name = key.slice(prefix.length);
			if (key.startsWith(prefix) && SAFE_NAME.test(name)) {
				return `${folder}/${name}.json`;
			}
		}
		return SHARED_FILE;
	}

	private contentsOf(file: string): string | null
	{
		if (file !== SHARED_FILE) {
			const key = [...this.values.keys()].find(candidate => this.fileOf(candidate) === file);
			return key === undefined ? null : this.values.get(key)!;
		}
		const shared: Record<string, string> = {};
		for (const [key, value] of this.values) {
			if (this.fileOf(key) === SHARED_FILE) {
				shared[key] = value;
			}
		}
		return JSON.stringify(shared);
	}

	private scheduleWrite(file: string): void
	{
		this.dirty.add(file);
		if (this.writing.has(file)) {
			return;
		}
		this.writing.add(file);
		// A macrotask later, so a burst of changes in one go is one write.
		setTimeout(() => this.write(file));
	}

	private write(file: string): void
	{
		this.dirty.delete(file);
		const contents = this.contentsOf(file);
		const operation = contents === null
			? this.bridge.invoke('storage_remove', {name: file})
			: this.bridge.invoke('storage_write', {name: file, contents});
		operation
			.catch(error => console.error(`Could not save ${file}:`, error))
			.finally(() => {
				if (this.dirty.has(file)) {
					this.write(file);
				} else {
					this.writing.delete(file);
				}
			});
	}

}
