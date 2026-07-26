import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';
import { effectiveInstallerType } from '@/scripts/manifest-linter/rules/installer/resolution';

const MSI_PROPERTY_TYPES = new Set(['msi', 'wix']);
const BLOCKED_MSI_PROPERTIES = new Set([
	'transforms',
	'patch',
	'msinewinstance',
	'adminproperties',
]);

function getNextToken(value: string, start: number): [string | undefined, number] {
	while (start < value.length && /[ \t]/.test(value[start] ?? '')) start++;
	if (start >= value.length) return [undefined, start];

	let position = start;
	const seekingSpace = value[position] !== '"';
	let withinQuotes = false;
	position++;
	while (position < value.length) {
		const character = value[position];
		const space = character === ' ' || character === '\t';
		const quote = character === '"';
		if (space || quote) {
			if (seekingSpace) {
				if (quote) withinQuotes = !withinQuotes;
				else if (!withinQuotes) break;
			} else if (quote) {
				position++;
				break;
			}
		}
		position++;
	}
	return [value.slice(start, position), position];
}

function tokenize(value: string): string[] {
	const result: string[] = [];
	let start = 0;
	while (start < value.length) {
		const [token, next] = getNextToken(value, start);
		if (!token) break;
		result.push(token);
		start = next;
	}
	return result;
}

function parseValue(token: string): string {
	if (!token.startsWith('"')) return token;
	let result = '';
	for (let index = 1; index < token.length; index++) {
		const character = token[index];
		if (character === '"') {
			if (index + 1 === token.length) break;
			throw new Error('invalid quote');
		}
		if (character === '\\' && token[index + 1] === '`') {
			result += '`';
			index++;
		} else if (character === '`') result += '"';
		else result += character;
	}
	return result;
}

function replaceLongOptions(tokens: string[]): string[] {
	const replacements = new Map<string, string[]>([
		['quiet', ['/qn']],
		['passive', ['/qb!-', 'REBOOTPROMPT=S']],
		['norestart', ['REBOOT=ReallySuppress']],
		['forcerestart', ['REBOOT=Force']],
		['promptrestart', ['REBOOTPROMPT=""']],
		['log', ['/l*']],
	]);
	return tokens.flatMap((token) => {
		if (!token.startsWith('/') && !token.startsWith('-')) return [token];
		return replacements.get(token.slice(1).toLowerCase()) ?? [token];
	});
}

function validateQuietModifier(value: string): void {
	const modifier = value || 'n';
	const base = modifier[0]?.toLowerCase();
	if (!base || !['f', 'r', 'b', '+', 'n'].includes(base)) throw new Error('invalid quiet mode');
	for (const character of modifier.slice(1)) {
		if ((character === '-' || character === '!') && base !== 'b')
			throw new Error('invalid quiet modifier');
	}
}

function validateLogModifier(modifier: string, file: string): void {
	if (!file.trim()) throw new Error('missing log file');
	for (const character of modifier) {
		if (!'mewuioarpcvx*+!'.includes(character)) throw new Error('invalid log modifier');
	}
}

function parseProperty(token: string): string {
	const first = token[0];
	if (!first || (first !== '%' && !/[A-Za-z0-9]/.test(first))) throw new Error('invalid property');
	const separator = token.indexOf('=');
	if (separator < 1 || /[ \t]/.test(token.slice(0, separator))) throw new Error('invalid property');

	const value = token.slice(separator + 1);
	if (value.startsWith('"')) {
		if (value.length < 2 || !value.endsWith('"')) throw new Error('invalid quoted property');
		const inner = value.slice(1, -1);
		for (let index = 0; index < inner.length; index++) {
			if (inner[index] !== '"') continue;
			if (inner[index + 1] !== '"') throw new Error('invalid quoted property');
			index++;
		}
	} else if (/[ \t]/.test(value)) throw new Error('invalid property value');
	return token.slice(0, separator);
}

function parseMsiArguments(value: string): string[] {
	const tokens = replaceLongOptions(tokenize(value));
	const properties: string[] = [];
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (!token) continue;
		if (!token.startsWith('/') && !token.startsWith('-')) {
			properties.push(parseProperty(token));
			continue;
		}
		if (token.length <= 1) throw new Error('invalid option');
		const option = token[1]?.toLowerCase();
		const modifier = parseValue(token.slice(2));
		if (option === 'q') validateQuietModifier(modifier);
		else if (option === 'l') {
			const fileToken = tokens[++index];
			if (!fileToken) throw new Error('missing log file');
			validateLogModifier(modifier, parseValue(fileToken));
		} else throw new Error('invalid option');
	}
	return properties;
}

export const switchesRule = defineInstallerRule({
	id: 'installer/switches',
	check({ installers, report }) {
		for (const installer of installers) {
			if (!MSI_PROPERTY_TYPES.has(String(effectiveInstallerType(installer)))) continue;
			let invalid = false;
			for (const value of Object.values(
				installer.InstallerSwitches as Record<string, string | null>,
			)) {
				if (!value) continue;
				try {
					for (const property of parseMsiArguments(value)) {
						if (BLOCKED_MSI_PROPERTIES.has(property.toLowerCase())) {
							report({ message: `blocked MSI property ${property}`, search: 'InstallerSwitches' });
						}
					}
				} catch {
					invalid = true;
					break;
				}
			}
			if (invalid) {
				report({
					message: 'InstallerSwitches contains invalid MSI switches',
					search: 'InstallerSwitches',
				});
			}
		}
	},
});
