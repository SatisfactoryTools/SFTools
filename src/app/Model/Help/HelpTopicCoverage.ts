import {Injectable} from '@angular/core';
import {HelpEditorArticle} from '@src/Model/API/Schema/Help/HelpEditorArticle';
import {HelpTopicCatalog} from '@src/Model/Help/HelpTopicCatalog';
import {HelpTopicClaim} from '@src/Model/Help/HelpTopicClaim';
import {HelpTopicStatus} from '@src/Model/Help/HelpTopicStatus';
import {HelpTopicStatusGroup} from '@src/Model/Help/HelpTopicStatusGroup';

/**
 * Pairs the topics the app asks for with the articles that answer them, for
 * the help editor. Drafts count as claims - the topic is taken either way,
 * the button just stays hidden until the article is published.
 */
@Injectable({providedIn: 'root'})
export class HelpTopicCoverage
{

	/** Every known topic, grouped the way the catalog groups them. */
	public groups(articles: HelpEditorArticle[]): HelpTopicStatusGroup[]
	{
		const claims = this.claims(articles);
		return HelpTopicCatalog.GROUPS.map(group => ({
			label: group.label,
			description: group.description,
			topics: HelpTopicCatalog.definitionsOf(group.group).map(definition => ({
				topic: definition.topic,
				label: definition.label,
				where: definition.where,
				known: true,
				claim: claims.get(definition.topic) ?? null,
			})),
		}));
	}

	/**
	 * Ids articles claim that the app never asks for - a typo in the id, or a
	 * button that was taken out. They answer nothing until they are corrected.
	 */
	public unknown(articles: HelpEditorArticle[]): HelpTopicStatus[]
	{
		const unknown: HelpTopicStatus[] = [];
		for (const [topic, claim] of this.claims(articles)) {
			if (!HelpTopicCatalog.knows(topic)) {
				unknown.push({topic, label: 'Unknown id', where: 'No button asks for this.', known: false, claim});
			}
		}
		return unknown;
	}

	/** How many known topics have an article, out of how many there are. */
	public answered(articles: HelpEditorArticle[]): number
	{
		const claims = this.claims(articles);
		return HelpTopicCatalog.DEFINITIONS.filter(definition => claims.has(definition.topic)).length;
	}

	public total(): number
	{
		return HelpTopicCatalog.DEFINITIONS.length;
	}

	private claims(articles: HelpEditorArticle[]): Map<string, HelpTopicClaim>
	{
		const claims = new Map<string, HelpTopicClaim>();
		for (const article of articles) {
			for (const [topic, anchor] of Object.entries(article.topics)) {
				claims.set(topic, {id: article.id, title: article.title, published: article.published, anchor});
			}
		}
		return claims;
	}

}
