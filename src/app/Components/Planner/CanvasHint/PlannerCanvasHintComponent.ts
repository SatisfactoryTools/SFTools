import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Component({
	selector: 'planner-canvas-hint',
	template: `
		@if (text(); as hint) {
			<div class="canvas-hint">{{ hint }}</div>
		}
	`,
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			padding: 1rem;
			pointer-events: none;
		}
		.canvas-hint {
			max-width: 24rem;
			padding: 0.75rem 1rem;
			text-align: center;
			color: #c5d0db;
			background: rgba(var(--bs-dark-rgb), 0.85);
			border: 1px dashed #6a7d91;
		}
	`,
})
export class PlannerCanvasHintComponent
{

	public readonly text = computed<string | null>(() => {
		if (this.planManager.activeFolder() !== null) {
			return null;
		}
		const plan = this.planManager.activePlan();
		if (!plan) {
			return 'Pick what you want to make in the Production request panel. The factory shows up here. ' + this.byHandText();
		}
		if ((plan.graph?.nodes.length ?? 0) > 0) {
			return null;
		}
		if (!plan.requests.some(request => request.itemClassName !== '')) {
			return 'Add an item in the Production request panel and the factory shows up here. ' + this.byHandText();
		}
		if (this.planManager.activeSettings()?.calculationMode !== 'automatic') {
			return 'Press Calculate to build the factory.';
		}
		return null;
	});

	public constructor(
		private readonly planManager: PlanManager,
		private readonly hotkeys: HotkeyService,
	)
	{
	}

	private byHandText(): string
	{
		const key = this.hotkeys.label('graph.addNode');
		return key === '' ? 'Or right‑click here to add nodes by hand.' : `Or press ${key} or right‑click here to add nodes by hand.`;
	}

}
