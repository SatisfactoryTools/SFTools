export interface ConflictResolution<T>
{
	readonly local: T;
	readonly remote: T;
}
