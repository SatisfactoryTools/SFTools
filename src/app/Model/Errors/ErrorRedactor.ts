import {Injectable} from '@angular/core';

const SECRET_NAMES = 'code|state|token|access_?token|refresh_?token|id_?token|poll_?token|password|secret|key|email';

/**
 * Applied to everything a report carries (and the copied details): page and API URLs, error bodies, messages and stacks.
 * Plan ids are cut short because a plan's link opens it for anyone; the prefix still finds the row.
 */
@Injectable({providedIn: 'root'})
export class ErrorRedactor
{

	private readonly rules: [RegExp, string][] = [
		[new RegExp(`([?&#](?:${SECRET_NAMES})=)[^&#\\s]*`, 'gi'), '$1[redacted]'],
		[new RegExp(`("(?:${SECRET_NAMES}|accessToken|refreshToken|pollToken|idToken)"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`, 'gi'), '$1"[redacted]"'],
		[/\bBearer\s+[\w.~+/=-]+/gi, 'Bearer [redacted]'],
		[/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]'],
		[/[\w.+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi, '[email]'],
		[/\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '$1…'],
		[/(\/home\/|\/Users\/|[a-z]:\\Users\\)[^/\\\s]+/gi, '$1[user]'],
	];

	public redact(text: string): string
	{
		return this.rules.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
	}

}
