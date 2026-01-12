import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Please provide the connection string as an argument or set DATABASE_URL in .env');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();

        // 1. Initial Schema
        const schemaSql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20260112000000_initial_schema.sql'), 'utf8');
        console.log('Running Initial Schema...');
        await client.query(schemaSql);

        // 2. Permissions Fix
        const permsSql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/fixes_permissions.sql'), 'utf8');
        console.log('Running Permissions Fix...');
        await client.query(permsSql);

        // 3. Row Order Migration
        const orderSql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20260112000001_add_row_order.sql'), 'utf8');
        console.log('Running Order Migration...');
        await client.query(orderSql);

        // 4. Field Order Migration
        const fieldOrderSql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20260112000002_add_field_order.sql'), 'utf8');
        console.log('Running Field Order Migration...');
        await client.query(fieldOrderSql);

        console.log('✅ Success! Database updated.');
    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
