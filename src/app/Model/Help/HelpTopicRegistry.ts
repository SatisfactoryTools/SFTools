import {Injectable, computed} from '@angular/core';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HelpTopic} from '@src/Model/Help/HelpTopic';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';

/**
 * Resolves the topic ids question-mark buttons are placed with (for example
 * `planner.overclocking`) to the article that answers them. A topic belongs to
 * exactly one article - the backend refuses a second claim - so buttons can be
 * put anywhere in the app and simply stay hidden until an article picks the
 * topic up.
 */
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
