/**
 * How a power figure's sign reads. `plain` shows the magnitude; `balance`
 * is the power panel's convention where a positive is consumption (shown
 * plain) and a negative is production ("+150 MW"); `net` is production minus
 * consumption, a surplus reading "+150 MW" and a deficit "-150 MW".
 */
export type PowerSign = 'plain' | 'balance' | 'net';
