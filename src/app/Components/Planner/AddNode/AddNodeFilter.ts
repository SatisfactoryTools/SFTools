/**
 * Restricts the add-node dialog to node types that can consume or produce one
 * specific item - set when the dialog completes a connect-to-blank gesture.
 */
export interface AddNodeFilter
{
	readonly itemClassName: string;
	/** What the new node must do with the item. */
	readonly role: 'consumer' | 'producer';
}
