import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }
    const exists = data.find(b => b.name === 'project_files');
    if (exists) {
        console.log('✅ Success: project_files bucket exists!');
    } else {
        console.log('❌ Failure: project_files bucket NOT found.');
        console.log('Buckets found:', data.map(b => b.name));
    }
}
check();
