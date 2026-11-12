import {Injectable} from '@angular/core';
import {ModFilter} from '@src/Model/Mods/ModFilter';

// The fullscreen codex has no toolbar, so its lists carry the filter themselves.
@Injectable()
export class PageModFilter extends ModFilter
{
}
