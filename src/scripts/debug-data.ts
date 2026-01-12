
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect(projectId: string) {
    console.log(`Inspecting Project: ${projectId}`);

    // 1. Find the collection
    const { data: collections } = await supabase
        .schema('built_flexdata')
        .from('collections')
        .select('*')
        .eq('project_id', projectId);

    if (!collections || collections.length === 0) {
        console.log('No collections found');
        return;
    }

    const collection = collections.find(c => ['songs', 'tracks', 'audio', 'voice_clips'].some(key => c.name.toLowerCase().includes(key))) || collections[0];
    console.log('Target Collection:', collection.name, `(${collection.id})`);

    // 2. Get Fields
    const { data: fields } = await supabase
        .schema('built_flexdata')
        .from('fields')
        .select('*')
        .eq('collection_id', collection.id);

    console.log('\n--- FIELDS ---');
    fields?.forEach(f => console.log(`- Label: "${f.label}", Key: "${f.name}", Type: ${f.type}`));

    // 3. Get Rows
    const { data: rows } = await supabase
        .schema('built_flexdata')
        .from('rows')
        .select('*')
        .eq('collection_id', collection.id)
        .limit(3);

    console.log('\n--- ROW DATA SAMPLE ---');
    rows?.forEach(r => console.log(JSON.stringify(r.data, null, 2)));
}

inspect('257b7d62-0111-4d60-84ca-18ade62dc0e6');
