import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const rawText = await file.text();
    // Handle CSV with Byte Order Mark (BOM)
    const cleanText = rawText.replace(/^\uFEFF/, '');

    // Parse CSV with auto-detection of delimiters (e.g. comma, semicolon, tab)
    const parseResult = Papa.parse(cleanText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors && parseResult.errors.length > 0 && parseResult.data.length === 0) {
      const firstError = parseResult.errors[0];
      return NextResponse.json(
        { error: `CSV Parsing error: ${firstError.message} at row ${firstError.row}` },
        { status: 400 }
      );
    }

    const headers = parseResult.meta.fields || [];
    const rows = parseResult.data as Record<string, string>[];

    // Clean and validate rows (remove completely empty rows, trim values)
    const cleanRows = rows
      .map((row) => {
        const cleanRow: Record<string, string> = {};
        let hasData = false;
        for (const [key, value] of Object.entries(row)) {
          if (!key) continue;
          const trimmedVal = (value || '').trim();
          cleanRow[key] = trimmedVal;
          if (trimmedVal !== '') {
            hasData = true;
          }
        }
        return hasData ? cleanRow : null;
      })
      .filter((row): row is Record<string, string> => row !== null);

    return NextResponse.json({
      headers,
      previewRows: cleanRows.slice(0, 100),
      rowCount: cleanRows.length,
    });
  } catch (err: any) {
    console.error('Error parsing CSV in API route:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred while parsing the CSV file' },
      { status: 400 }
    );
  }
}
