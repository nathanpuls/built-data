import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Built.at Public Proxy Endpoints
// URL format: http://localhost:3001/api/v1/:projectId/:collectionId
app.get('/api/v1/:projectId/:collectionId', async (req, res) => {
    const { projectId, collectionId } = req.params;

    console.log(`[API] Fetching data for Project: ${projectId}, Collection: ${collectionId}`);

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Server configuration missing' });
    }

    try {
        let finalCollectionId = collectionId;

        // Auto-resolve collection name to ID if it doesn't look like a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(collectionId);

        if (!isUuid) {
            console.log(`[API] Resolving name "${collectionId}" for project ${projectId}...`);
            const lookupUrl = `${supabaseUrl}/rest/v1/collections?project_id=eq.${projectId}&name=eq.${collectionId}&select=id`;
            const lookupRes = await fetch(lookupUrl, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Accept-Profile': 'built_flexdata'
                }
            });
            const lookupData: any = await lookupRes.json();
            if (Array.isArray(lookupData) && lookupData.length > 0) {
                finalCollectionId = lookupData[0].id;
                console.log(`[API] Resolved to ID: ${finalCollectionId}`);
            } else {
                console.log(`[API] Could not resolve name "${collectionId}"`);
            }
        }

        // Construct the internal Supabase request
        const targetUrl = `${supabaseUrl}/rest/v1/rows?collection_id=eq.${finalCollectionId}&select=data`;

        const response = await fetch(targetUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Accept-Profile': 'built_flexdata'
            }
        });

        const data = await response.json();

        // Return only the "data" portion
        if (Array.isArray(data)) {
            return res.json({
                count: data.length,
                results: data.map((item: any) => item.data)
            });
        }

        res.json(data);
    } catch (error: any) {
        console.error('[API ERROR]', error.message);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Built.at API Gateway running at http://localhost:${PORT}`);
    console.log(`👉 Example: http://localhost:${PORT}/api/v1/YOUR_PROJECT_ID/YOUR_COLLECTION_ID`);
});
