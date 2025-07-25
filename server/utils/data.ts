import fs from 'fs/promises';
import path from 'path';

export async function readJsonData(fileName: string) {
    try {
        // In production, always use the public URL for better reliability
        if (process.env.NODE_ENV === 'production') {
            try {
                // Use the runtime config to get the base URL
                const config = useRuntimeConfig();
                const baseUrl = config.public.siteUrl || (process.env.NODE_ENV === 'production' ? 'https://artistic-ai.hfbk.net' : 'http://localhost:3000');
                const url = `${baseUrl}/data/${fileName}`;
                
                console.log(`Attempting to fetch from: ${url}`);
                const response = await fetch(url);
                
                if (response.ok) {
                    const fileContent = await response.text();
                    const data = JSON.parse(fileContent);
                    console.log(`Successfully loaded ${fileName} from public URL`);
                    return data;
                } else {
                    console.error(`Failed to fetch ${fileName}: ${response.status} ${response.statusText}`);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (fetchError) {
                console.error(`Fetch failed for ${fileName}:`, fetchError);
                // Don't throw here, fall back to filesystem
            }
        }
        
        // Fallback to filesystem (works in development and as backup in production)
        let fullPath: string;
        
        try {
            // Try import.meta.url approach for ES modules
            const { fileURLToPath } = await import('url');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            fullPath = path.join(__dirname, '..', '..', 'public', 'data', fileName);
        } catch (error) {
            // Fallback to process.cwd() for development
            fullPath = path.join(process.cwd(), 'public', 'data', fileName);
        }
        
        console.log(`Reading file from filesystem: ${fullPath}`);
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        const data = JSON.parse(fileContent);
        console.log(`Successfully loaded ${fileName} from filesystem`);
        return data;
    } catch (error) {
        console.error(`Error reading or parsing JSON file at ${fileName}:`, error);
        console.error(`Full error details:`, error);
        throw new Error(`Could not load data from ${fileName}: ${error.message}`);
    }
} 