import { PDFParse } from 'pdf-parse';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const maxFileBytes = 10 * 1024 * 1024;
const maxExtractedChars = 60_000;

function isPdf(file: File): boolean {
	return (
		file.type === 'application/pdf' ||
		file.name.toLowerCase().endsWith('.pdf')
	);
}

function isPlainText(file: File): boolean {
	const name = file.name.toLowerCase();
	return (
		file.type.startsWith('text/') ||
		name.endsWith('.txt') ||
		name.endsWith('.md') ||
		name.endsWith('.markdown') ||
		name.endsWith('.csv') ||
		name.endsWith('.json')
	);
}

function titleFromName(name: string): string {
	return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || name;
}

function normalizeText(content: string): { content: string; truncated: boolean } {
	const normalized = content
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{4,}/g, '\n\n\n')
		.trim();

	return {
		content: normalized.slice(0, maxExtractedChars),
		truncated: normalized.length > maxExtractedChars,
	};
}

async function extractPdfText(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const parser = new PDFParse({ data: new Uint8Array(buffer) });

	try {
		const result = await parser.getText();
		return result.text;
	} finally {
		await parser.destroy().catch(() => undefined);
	}
}

export async function POST(request: NextRequest) {
	const formData = await request.formData().catch(() => null);
	const file = formData?.get('file');

	if (!(file instanceof File)) {
		return NextResponse.json({ error: 'Upload a file.' }, { status: 400 });
	}

	if (file.size > maxFileBytes) {
		return NextResponse.json(
			{ error: 'File is larger than 10 MB.' },
			{ status: 413 },
		);
	}

	if (!isPdf(file) && !isPlainText(file)) {
		return NextResponse.json(
			{ error: 'Only PDF, text, markdown, CSV, and JSON files are supported.' },
			{ status: 415 },
		);
	}

	try {
		const rawText = isPdf(file) ? await extractPdfText(file) : await file.text();
		const extracted = normalizeText(rawText);

		if (!extracted.content) {
			return NextResponse.json(
				{ error: 'No readable text was found in this file.' },
				{ status: 422 },
			);
		}

		return NextResponse.json({
			title: titleFromName(file.name),
			source: file.name,
			content: extracted.content,
			bytes: file.size,
			truncated: extracted.truncated,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Could not extract text from this file.',
			},
			{ status: 422 },
		);
	}
}
