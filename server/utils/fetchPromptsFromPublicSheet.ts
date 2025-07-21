import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

export async function fetchPromptsFromPublicSheet() {
  // Convert the Google Sheets share URL to a CSV export URL
  const sheetUrl = process.env.PROMPT_SHEET_URL!;
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Invalid PROMPT_SHEET_URL');
  const sheetId = match[1];
  // Default to first sheet (gid=0)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Failed to fetch Google Sheet CSV');
  const csvText = await response.text();

  // Parse CSV
  const records = parse(csvText, {
    columns: true, // Use first row as keys
    skip_empty_lines: true,
  });

  // Convert to { [promptName]: promptContent }
  const prompts: Record<string, string> = {};
  for (const row of records) {
    if (row['Prompt Name'] && row['Prompt Content']) {
      prompts[row['Prompt Name']] = row['Prompt Content'];
    }
  }
  return prompts;
} 