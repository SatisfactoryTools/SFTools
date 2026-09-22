/** Hands back what was registered with the hotkey service, so it can be dropped again. */
export interface HotkeyRegistration
{

	unregister(): void;

}
