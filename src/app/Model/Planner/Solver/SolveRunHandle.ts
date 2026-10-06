export interface SolveRunHandle
{

	cancelled: boolean;
	cancelCurrent: (() => void) | null;

}
