/**
 * How a production request constrains the solver: 'rate' demands a fixed
 * amount per minute, 'maximise' asks for as much as the resources allow.
 * Only one category (items, power, sink points) may be maximised at a time.
 */
export type ProductionRequestMode = 'rate' | 'maximise';
