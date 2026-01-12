/**
 * Built.at API Gateway - Cloudflare Worker
 * Provides public API access to Built.at projects
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Parse route: /api/v1/:projectId/:collectionId
        const pathMatch = url.pathname.match(/^\/api\/v1\/([^\/]+)\/([^\/]+)$/);

        if (!pathMatch) {
            return new Response(JSON.stringify({ error: 'Invalid route. Use: /api/v1/:projectId/:collectionId' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const [, projectId, collectionId] = pathMatch;

        console.log(`[API] Fetching data for Project: ${projectId}, Collection: ${collectionId}`);

        try {
            let finalCollectionId = collectionId;

            // Auto-resolve collection name to ID if it doesn't look like a UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(collectionId);

            if (!isUuid) {
                console.log(`[API] Resolving name "${collectionId}" for project ${projectId}...`);
                const lookupUrl = `${env.SUPABASE_URL}/rest/v1/collections?project_id=eq.${projectId}&name=eq.${collectionId}&select=id`;

                const lookupRes = await fetch(lookupUrl, {
                    headers: {
                        'apikey': env.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                        'Accept-Profile': 'built_flexdata'
                    }
                });

                const lookupData = await lookupRes.json();

                if (Array.isArray(lookupData) && lookupData.length > 0) {
                    finalCollectionId = lookupData[0].id;
                    console.log(`[API] Resolved to ID: ${finalCollectionId}`);
                } else {
                    console.log(`[API] Could not resolve name "${collectionId}"`);
                }
            }

            // Fetch rows from the collection
            const targetUrl = `${env.SUPABASE_URL}/rest/v1/rows?collection_id=eq.${finalCollectionId}&select=data`;

            const response = await fetch(targetUrl, {
                headers: {
                    'apikey': env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept-Profile': 'built_flexdata'
                }
            });

            const data = await response.json();

            // Return only the "data" portion
            if (Array.isArray(data)) {
                return new Response(JSON.stringify({
                    count: data.length,
                    results: data.map(item => item.data)
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('[API ERROR]', error.message);
            return new Response(JSON.stringify({ error: 'Failed to fetch data', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
