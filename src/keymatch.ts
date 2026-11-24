import { isMac } from './isMac.js';

/**
 * Parses an Electron-style match string into its components
 */
function parseMatchString(matchString: string) {
	if (!matchString?.trim()) {
		return { ctrl: false, alt: false, shift: false, meta: false, key: '' };
	}

	const parts = matchString.split('+');
	const key = parts[parts.length - 1]?.toLowerCase();
	if (!key) {
		throw new Error(`Invalid accelerator: ${matchString}`);
	}

	const modifierParts = parts.slice(0, -1).map((part) => part.toLowerCase());
	let ctrl = false,
		alt = false,
		shift = false,
		meta = false;

	for (const modifier of modifierParts) {
		switch (modifier) {
			case 'cmd':
			case 'command':
				meta = true;
				break;
			case 'ctrl':
			case 'control':
				ctrl = true;
				break;
			case 'cmdorctrl':
			case 'commandorcontrol':
				if (isMac()) {
					meta = true;
				} else {
					ctrl = true;
				}
				break;
			case 'alt':
				alt = true;
				break;
			case 'option':
				if (isMac()) {
					alt = true;
				}
				break;
			case 'shift':
				shift = true;
				break;
			case 'meta':
			case 'super':
				meta = true;
				break;
		}
	}

	return { ctrl, alt, shift, meta, key };
}

/**
 * Normalizes a key from a KeyboardEvent to match Electron's key naming
 */
function normalizeKey(key: string): string {
	const keyMap: Record<string, string> = {
		' ': 'space',
		arrowup: 'up',
		arrowdown: 'down',
		arrowleft: 'left',
		arrowright: 'right',
	};

	const normalized = key.toLowerCase();
	return keyMap[normalized] || normalized;
}

export type KeymatchOptions = {
	keyMode?: 'character' | 'physical';
};

/**
 * Shares the matcher's base key with shortcut recorders. Character mode follows
 * ASCII letters and digits; Alt, non-ASCII keys, and physical mode use the
 * letter/digit key position. Other keys retain their reported names.
 * The caller chooses the mode because events do not identify the OS layout.
 */
export function normalizedEventKey(
	{ code, key, altKey }: KeyboardEvent,
	{ keyMode = 'character' }: KeymatchOptions = {},
): string {
	if (keyMode === 'character' && !altKey && /^[a-zA-Z0-9]$/.test(key)) {
		return key.toLowerCase();
	}

	if (code) {
		if (/^Key[A-Z]$/.test(code)) {
			// e.g. KeyO => 'o'
			return code.slice(3).toLowerCase();
		}
		if (/^Digit[0-9]$/.test(code)) {
			// e.g. Digit5 => '5'
			return code.slice(5);
		}
	}

	// Fallback to the reported key, with Electron-style normalization
	return normalizeKey(key);
}

/**
 * Checks if a KeyboardEvent matches an Electron accelerator string
 *
 * @example
 * ```typescript
 * if (keymatch(event, 'CmdOrCtrl+N')) {
 *   event.preventDefault();
 *   createNewFile();
 * }
 * ```
 */
export function keymatch(
	event: KeyboardEvent,
	matchString: string,
	options?: KeymatchOptions,
): boolean {
	const { ctrl, alt, shift, meta, key } = parseMatchString(matchString);

	return (
		normalizedEventKey(event, options) === key &&
		event.ctrlKey === ctrl &&
		event.altKey === alt &&
		event.shiftKey === shift &&
		event.metaKey === meta
	);
}
