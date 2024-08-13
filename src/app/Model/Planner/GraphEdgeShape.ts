/**
 * How edges are drawn: 'multisegment' keeps the corners ELK routes around
 * nodes and labels, 'straight' connects nodes directly without corners.
 */
export type GraphEdgeShape = 'multisegment' | 'straight';
