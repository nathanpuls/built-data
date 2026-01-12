import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; // Usually anon can't list buckets, but let's try or just try an upload

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    console.log("Checking storage bucket 'built_flexdata'...");

    // Attempt to list files in the bucket (will fail if bucket doesn't exist or no permission)
    const { data, error } = await supabase.storage.from('built_flexdata').list();

    if (error) {
        console.error("Error accessing bucket:", error.message);
        console.log("\nIf the bucket doesn't exist, please run this SQL in your Supabase Dashboard:\n");
        console.log(`
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('built_flexdata', 'built_flexdata', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Public Access
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'built_flexdata');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'built_flexdata');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'built_flexdata');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'built_flexdata');
        `);
    } else {
        console.log("Successfully connected to 'built_flexdata' bucket!");
        console.log("Found", data.length, "files.");
    }
}

checkStorage();
