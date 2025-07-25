import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export async function readJsonData(fileName: string) {
    try {
        // Use import.meta.url for reliable path resolution in both dev and production
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const fullPath = path.join(__dirname, '..', '..', 'public', 'data', fileName);
        
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data && Array.isArray(data.questions)) {
            return data.questions;
        }
        if (Array.isArray(data)) {
            return data;
        }
        return [];
    } catch (error) {
        console.error(`Error reading or parsing JSON file at ${fileName}:`, error);
        throw new Error(`Could not load data from ${fileName}`);
    }
} 