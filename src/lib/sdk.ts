import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This would be the "built.at" SDK that users import
export class BuiltSDK {
    private client: SupabaseClient;
    private projectId: string;

    constructor(supabaseUrl: string, supabaseKey: string, projectId: string) {
        this.client = createClient(supabaseUrl, supabaseKey);
        this.projectId = projectId;
    }

    // Helper to access the flexdata schema
    private get schema() {
        return this.client.schema('built_flexdata');
    }

    /**
     * Get all rows for a collection
     */
    async get(collectionName: string) {
        // First resolve collection ID from name
        // In a real SDK, we'd cache this mapping
        const { data: collection } = await this.schema
            .from('collections')
            .select('id')
            .eq('project_id', this.projectId)
            .eq('name', collectionName)
            .single();

        if (!collection) throw new Error(`Collection '${collectionName}' not found`);

        const { data } = await this.schema
            .from('rows')
            .select('data')
            .eq('collection_id', collection.id);

        return data?.map(row => row.data) || [];
    }

    /**
     * Add a row
     */
    async add(collectionName: string, data: any) {
        const { data: collection } = await this.schema
            .from('collections')
            .select('id')
            .eq('project_id', this.projectId)
            .eq('name', collectionName)
            .single();

        if (!collection) throw new Error(`Collection '${collectionName}' not found`);

        return await this.schema
            .from('rows')
            .insert([{
                collection_id: collection.id,
                data: data
            }]);
    }
}
