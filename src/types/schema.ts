export interface Project {
    id: string;
    name: string;
    description: string | null;
    api_key: string;
    created_at: string;
}

export interface Collection {
    id: string;
    project_id: string;
    name: string;
    created_at: string;
}

export interface Field {
    id: string;
    collection_id: string;
    name: string;
    type: 'text' | 'longtext' | 'number' | 'boolean' | 'date' | 'json' | 'file';
    label: string | null;
    required: boolean;
    sort_order?: number;
    created_at: string;
}

export interface Row {
    id: string;
    collection_id: string;
    data: Record<string, any>;
    buyer_uid: string | null;
    sort_order?: number;
    created_at: string;
    updated_at: string;
}
