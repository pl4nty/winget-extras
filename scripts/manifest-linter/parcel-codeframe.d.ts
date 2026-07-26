declare module '@parcel/codeframe' {
	type Position = { line: number; column: number };
	type Highlight = { start: Position; end: Position; message?: string };

	export default function codeFrame(
		code: string,
		highlights: Highlight[],
		options?: {
			useColor?: boolean;
			syntaxHighlighting?: boolean;
			language?: string;
			maxLines?: number;
			terminalWidth?: number;
			padding?: { before: number; after: number };
		},
	): string;
}
