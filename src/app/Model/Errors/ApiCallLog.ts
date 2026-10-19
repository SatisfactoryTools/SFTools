import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpRequest, HttpResponse} from '@angular/common/http';
import {env} from '@env/env';
import {ApiCall} from '@src/Model/Errors/ApiCall';

const SIZE = 15;

const ERROR_BODY_LENGTH = 1000;

const OUTLINE_KEYS = 8;

/**
 * The last few API calls, attached to error reports: many errors are a reaction to a response that was not what the
 * code expected. Successful bodies are only outlined (keys, lengths) - they can be megabytes, and hold the user's data.
 */
@Injectable({providedIn: 'root'})
export class ApiCallLog
{

	private readonly calls: ApiCall[] = [];

	public recordResponse(req: HttpRequest<unknown>, response: HttpResponse<unknown>): void
	{
		this.push(req, response.status, this.outline(response.body));
	}

	public recordFailure(req: HttpRequest<unknown>, error: HttpErrorResponse): void
	{
		this.push(req, error.status, this.errorBody(error.error));
	}

	public describe(): string[]
	{
		return this.calls.map(call => `${call.time.toISOString().slice(11, 23)} ${call.method} ${call.url} → ${call.status === 0 ? 'no response' : call.status}: ${call.response}`);
	}

	public errorBody(body: unknown): string
	{
		if (body === null || body === undefined || body === '') {
			return 'empty';
		}
		let text: string;
		if (typeof body === 'string') {
			text = body;
		} else if (body instanceof ProgressEvent) {
			return 'network failure';
		} else {
			try {
				text = JSON.stringify(body);
			} catch {
				text = String(body);
			}
		}
		return text.length > ERROR_BODY_LENGTH ? `${text.slice(0, ERROR_BODY_LENGTH)}… (${text.length} chars)` : text;
	}

	private push(req: HttpRequest<unknown>, status: number, response: string): void
	{
		const url = req.urlWithParams.startsWith(env.apiUrl) ? req.urlWithParams.slice(env.apiUrl.length) : req.urlWithParams;
		this.calls.push({time: new Date(), method: req.method, url, status, response});
		if (this.calls.length > SIZE) {
			this.calls.shift();
		}
	}

	private outline(body: unknown, depth = 0): string
	{
		if (body === null || body === undefined) {
			return String(body);
		}
		if (Array.isArray(body)) {
			return body.length === 0 || depth > 0 ? `array(${body.length})` : `array(${body.length}) of ${this.outline(body[0], depth + 1)}`;
		}
		if (typeof body === 'object') {
			const keys = Object.keys(body);
			const shown = keys.slice(0, OUTLINE_KEYS).join(', ');
			return `object{${shown}${keys.length > OUTLINE_KEYS ? `, +${keys.length - OUTLINE_KEYS}` : ''}}`;
		}
		if (typeof body === 'string') {
			return `text(${body.length})`;
		}
		return typeof body;
	}

}
