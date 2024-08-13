import type loadHighs from 'highs';

type HighsInstance = Awaited<ReturnType<typeof loadHighs>>;
export type HighsSolution = ReturnType<HighsInstance['solve']>;
