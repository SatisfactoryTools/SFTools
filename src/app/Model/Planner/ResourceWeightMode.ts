/**
 * How a plan prices raw resources for the solver:
 * - map: from the version's world limits - the most abundant resource weighs 1, rarer ones proportionally more, water and other uncapped resources 0.01 (the default)
 * - limits: like map, but from the limits actually set (own or pooled), unlimited resources weigh 0.01
 * - equal: every resource weighs 1
 * - manual: the user's own values (PlanSettings.resourceWeights)
 */
export type ResourceWeightMode = 'map' | 'limits' | 'equal' | 'manual';
