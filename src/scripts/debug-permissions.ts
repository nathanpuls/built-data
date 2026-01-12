import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
const { Client } = pg;

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_KEY || !DATABASE_URL) {
    console.error("Missing env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or DATABASE_URL");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pgClient = new Client({ connectionString: DATABASE_URL });

async function runTest() {
    console.log("--- STARTING PERMISSION DIAGNOSTICS ---");

    // 1. Test Postgres Connection & Row Deletion (Bypassing RLS first to check connection, then simulates RLS via Supabase Client)
    // Actually, let's use the Supabase Client for EVERYTHING because that matches the Frontend.
    // We only use PG for setup if needed.

    // FETCH A COLLECTION TO USE
    const { data: cols, error: colError } = await supabase.schema('built_flexdata').from('collections').select('*').limit(1);

    if (colError || !cols || cols.length === 0) {
        console.error("❌ Cannot fetch collections. Check tables exist.", colError);
        return;
    }
    const collectionId = cols[0].id;
    console.log(`✅ Found Collection ID: ${collectionId}`);

    // TEST 1: INSERT ROW (Auth Client)
    // We need to be 'authenticated' usually, but here we are using Anon Key. The policies allow Anon?
    // The policies I gave allowed "anon".

    console.log("Attempting INSERT via Supabase Client...");
    const { data: inserted, error: insertError } = await supabase
        .schema('built_flexdata')
        .from('rows')
        .insert([{ collection_id: collectionId, data: { test: true }, sort_order: 9999 }])
        .select()
        .single();

    if (insertError) {
        console.error("❌ INSERT Failed:", insertError);
    } else {
        console.log("✅ INSERT Success:", inserted.id);

        // TEST 2: DELETE ROW (Auth Client)
        console.log("Attempting DELETE via Supabase Client...");
        const { error: deleteError } = await supabase
            .schema('built_flexdata')
            .from('rows')
            .delete()
            .eq('id', inserted.id);

        if (deleteError) {
            console.error("❌ DELETE Failed:", deleteError);
        } else {
            console.log("✅ DELETE Success (No Error Returned)");
            // Verify it's gone
            const { data: check } = await supabase.schema('built_flexdata').from('rows').select('*').eq('id', inserted.id);
            if (check && check.length === 0) console.log("✅ Verified: Row is gone.");
            else console.error("❌ Verified: Row STILL EXISTS after delete call.");
        }
    }

    // TEST 3: STORAGE UPLOAD
    console.log("Attempting STORAGE Upload (built_flexdata)...");
    const fileName = `test_${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('built_flexdata')
        .upload(fileName, "Hello World", { upsert: true });

    if (uploadError) {
        console.error("❌ STORAGE Failed:", uploadError);
        console.log("Trying 'project_files' bucket just in case...");
        const { error: oldBucketError } = await supabase.storage.from('project_files').upload(fileName, "Hello");
        if (oldBucketError) console.error("❌ STORAGE 'project_files' also failed:", oldBucketError);
    } else {
        console.log("✅ STORAGE Success:", uploadData);
    }

    pgClient.end();
}

runTest();
