import {ConfirmRequest} from '@src/Components/Common/ConfirmRequest';

export interface PendingConfirm
{
	readonly request: ConfirmRequest;
	readonly resolve: (confirmed: boolean) => void;
}
