/**
 * How a folder with custom settings treats one settings group for its inner
 * plans: a default seeding new plans, a fixed value pushed into every plan,
 * or (resources only) one pool of raw resources shared by all plans.
 */
export type FolderGroupMode = 'default' | 'fixed' | 'pool';
