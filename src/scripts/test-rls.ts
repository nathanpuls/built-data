import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function checkRLS() {
    console.log("Checking RLS Status for built_flexdata.rows...");

    // There isn't a direct way to check RLS status via the JS client easily without hitting a system table
    // But we can try a DELETE that we know should fail if RLS is on and no policies exist, 
    // vs a DELETE that fails with 404 (wrong ID) but no RLS error.

    // Let's try to fetch rows first.
    const { data: rows, error: readError } = await supabase.schema('built_flexdata').from('rows').select('*').limit(1);

    if (readError) {
        console.error("READ ERROR (Maybe RLS?):", readError);
    } else {
        console.log(`READ SUCCESS: Found ${rows?.length} rows.`);
    }

    // Try deleting a non-existent ID
    const fakeId = '00000000-0000-0000-0000-000000000000';
    console.log(`Testing DELETE on fake ID: ${fakeId}`);
    const { error: deleteError } = await supabase.schema('built_flexdata').from('rows').delete().eq('id', fakeId);

    if (deleteError) {
        console.error("DELETE TEST ERROR:", deleteError);
    } else {
        console.log("DELETE TEST SUCCESS (No error returned for fake ID, which is normal for Supabase DELETE).");
    }
}

checkRLS();
