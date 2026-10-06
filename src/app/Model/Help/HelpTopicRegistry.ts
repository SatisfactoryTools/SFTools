import {Injectable, computed} from '@angular/core';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HelpTopic} from '@src/Model/Help/HelpTopic';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';

@Injectable({providedIn: 'root'})
export class HelpTopicRegistry
{

	private readonly topics = computed<Map<string, HelpTopic>>(() => {
		const topics = new Map<string, HelpTopic>();
		for (const [slug, article] of Object.entries(this.help.articles())) {
			for (const [topic, anchor] of Object.entries(article.topics)) {
				topics.set(topic, {slug, anchor});
			}
		}
		return topics;
	});

	public constructor(private readonly help: HelpManager)
	{
	}

	public resolve(topic: HelpTopicId): HelpTopic | null
	{
		return this.topics().get(topic) ?? null;
	}

	public has(topic: HelpTopicId): boolean
	{
		return this.topics().has(topic);
	}

}
