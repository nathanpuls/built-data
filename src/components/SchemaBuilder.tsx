import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, Collection, Field } from '../types/schema';
import { Plus, Trash2, GripVertical, Check, Settings, Pencil, X, AlertTriangle, Sparkles, Copy } from 'lucide-react';

// DnD Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SchemaBuilderProps {
    project: Project;
}

// ---------------------------
// SORTABLE FIELD COMPONENT
// ---------------------------
function SortableFieldRow({
    field,
    setEditingField,
    deleteField
}: {
    field: Field,
    setEditingField: (f: Field) => void,
    deleteField: (id: string) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-4 flex items-center gap-4 group hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${isDragging ? 'bg-blue-50 shadow-lg border border-blue-200 z-10' : ''}`}
        >
            <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 p-1">
                <GripVertical className="w-5 h-5" />
            </button>
            <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                <div>
                    <div className="font-bold text-gray-900 text-sm">{field.label}</div>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs uppercase font-bold tracking-wide">
                        {field.type}
                    </span>
                </div>
                <div className="text-sm text-gray-500 italic"></div>
                <div className="text-right">
                    {field.required && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Required
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setEditingField(field)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Edit Field"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => deleteField(field.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete Field"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// Helper to generate a stable, random 6-character hash for internal keys
const generateFieldKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `fld_${result}`;
};

export function SchemaBuilder({ project }: SchemaBuilderProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [fields, setFields] = useState<Field[]>([]);

    // Project Name State
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [projectName, setProjectName] = useState(project.name);

    async function updateProjectName() {
        setIsEditingProject(false);
        if (!projectName.trim() || projectName === project.name) return;

        const { error } = await supabase
            .schema('built_flexdata')
            .from('projects')
            .update({ name: projectName })
            .eq('id', project.id);

        if (error) {
            console.error('Error updating project:', error);
            setProjectName(project.name); // Revert on error
        }
    }



    // Create Collection State
    const [newCollectionName, setNewCollectionName] = useState('');

    // Create Field State
    const [newField, setNewField] = useState({
        name: '',
        type: 'text' as const,
        label: '',
        required: false
    });

    // Edit Field State
    const [editingField, setEditingField] = useState<Field | null>(null);

    // Collection State
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

    // AI Integrator State
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateAIPrompt = () => {
        const proxyBase = `http://localhost:3001/api/v1/${project.id}`;
        return `I am using Built.at (a Headless CMS) for my project. 
Please act as an Integration Specialist. I will provide you with my existing code, and I want you to help me connect it to my Built.at database.

### PROJECT CONTEXT:
- Project ID: ${project.id}
- Base API URL: ${proxyBase}

### DATA SCHEMA:
- Collection: "${selectedCollection?.name}" (ID: ${selectedCollection?.id})
- Field Mapping Guide (Label -> Internal Key):
${fields.map(f => `  * "${f.label || f.name}": row.data["${f.name}"] (${f.type})`).join('\n')}

### DATA STRUCTURE:
The API returns a JSON object with a "results" array. 
Each item in the array is a data object. To access a value, you MUST use the internal keys provided above.

### MY GOAL:
I am going to paste my current source code below. 
1. Identify all hardcoded text, images, or audio links.
2. Replace them with dynamic 'placeholders' that fetch from ${selectedCollection?.name}.
3. IMPORTANT: Use the internal gibberish keys from the schema above (e.g. item["${fields[0]?.name || 'uuid_key'}"]) not the labels.

---
PASTE YOUR CODE BELOW THIS LINE:`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateAIPrompt());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchCollections();
    }, [project.id]);

    useEffect(() => {
        if (selectedCollection) {
            fetchFields(selectedCollection.id);
        } else {
            setFields([]);
        }
    }, [selectedCollection]);

    async function fetchCollections() {
        const { data } = await supabase
            .schema('built_flexdata')
            .from('collections')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at');
        setCollections(data || []);
        if (data && data.length > 0 && !selectedCollection) {
            setSelectedCollection(data[0]);
        }
    }

    async function fetchFields(collectionId: string) {
        const { data } = await supabase
            .schema('built_flexdata')
            .from('fields')
            .select('*')
            .eq('collection_id', collectionId)
            .order('sort_order', { ascending: true }) // Sort by user defined order
            .order('created_at', { ascending: true });
        setFields(data || []);
    }

    async function createCollection(e: React.FormEvent) {
        e.preventDefault();
        if (!newCollectionName.trim()) return;

        const { data, error } = await supabase
            .schema('built_flexdata')
            .from('collections')
            .insert([{ project_id: project.id, name: newCollectionName }])
            .select()
            .single();

        if (!error && data) {
            setCollections([...collections, data]);
            setNewCollectionName('');
            setSelectedCollection(data);
        }
    }

    async function createField(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCollection || !newField.label.trim()) return;

        // Calc new sort order
        const maxSort = fields.length > 0 ? Math.max(...fields.map(f => f.sort_order || 0)) : 0;

        const { data, error } = await supabase
            .schema('built_flexdata')
            .from('fields')
            .insert([{
                collection_id: selectedCollection.id,
                name: generateFieldKey(), // Internal random hash
                type: newField.type,
                label: newField.label || 'Untitled Field',
                required: newField.required,
                sort_order: maxSort + 1000
            }])
            .select()
            .single();

        if (!error && data) {
            setFields([...fields, data]);
            setNewField({ name: '', type: 'text', label: '', required: false });
        }
    }

    // --- FIELD REORDER LOGIC ---
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setFields((items) => {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            const newOrder = arrayMove(items, oldIndex, newIndex);

            const movedItem = newOrder[newIndex];
            const prevItem = newOrder[newIndex - 1];
            const nextItem = newOrder[newIndex + 1];

            let newSortOrder = 0;
            if (!prevItem && !nextItem) newSortOrder = 1000;
            else if (!prevItem) newSortOrder = (nextItem.sort_order || 0) / 2;
            else if (!nextItem) newSortOrder = (prevItem.sort_order || 0) + 1000;
            else newSortOrder = ((prevItem.sort_order || 0) + (nextItem.sort_order || 0)) / 2;

            movedItem.sort_order = newSortOrder;

            // Update DB async
            supabase
                .schema('built_flexdata')
                .from('fields')
                .update({ sort_order: newSortOrder })
                .eq('id', movedItem.id)
                .then(({ error }) => { if (error) console.error("Sort failed", error); });

            return newOrder;
        });
    }

    async function updateField(e: React.FormEvent) {
        e.preventDefault();
        if (!editingField) return;

        const { data, error } = await supabase
            .schema('built_flexdata')
            .from('fields')
            .update({
                name: editingField.name,
                label: editingField.label,
                type: editingField.type,
                required: editingField.required
            })
            .eq('id', editingField.id)
            .select()
            .single();

        if (!error && data) {
            setFields(fields.map(f => f.id === data.id ? data : f));
            setEditingField(null);
        }
    }

    async function updateCollection(e: React.FormEvent) {
        e.preventDefault();
        if (!editingCollection || !editingCollection.name.trim()) return;

        const { data, error } = await supabase
            .schema('built_flexdata')
            .from('collections')
            .update({ name: editingCollection.name })
            .eq('id', editingCollection.id)
            .select()
            .single();

        if (!error && data) {
            setCollections(collections.map(c => c.id === data.id ? data : c));
            setEditingCollection(null);
            if (selectedCollection?.id === data.id) setSelectedCollection(data);
        }
    }

    async function deleteCollection(id: string) {
        try {
            const { error } = await supabase.schema('built_flexdata').from('collections').delete().eq('id', id);

            if (error) {
                console.error("Delete failed:", error);
                alert("Could not delete: " + error.message);
                return;
            }

            setCollections(collections.filter(c => c.id !== id));
            setCollectionToDelete(null);
            if (selectedCollection?.id === id) setSelectedCollection(null);
        } catch (err: any) {
            console.error(err);
            alert("An error occurred during deletion.");
        }
    }

    async function deleteField(id: string) {
        await supabase.schema('built_flexdata').from('fields').delete().eq('id', id);
        setFields(fields.filter(f => f.id !== id));
    }

    return (
        <div className="flex h-full relative">
            {/* Edit Modal Overlay */}
            {editingField && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Edit Field</h3>
                            <button onClick={() => setEditingField(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={updateField} className="space-y-4">
                            {/* Swapped Order: Label First */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Display Label</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                    value={editingField.label || ''}
                                    onChange={e => setEditingField({ ...editingField, label: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Type</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                        value={editingField.type}
                                        onChange={e => setEditingField({ ...editingField, type: e.target.value as any })}
                                    >
                                        <option value="text">Text (Single Line)</option>
                                        <option value="longtext">Long Text (Multi-line)</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="date">Date</option>
                                        <option value="json">JSON</option>
                                        <option value="file">File</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Validation</label>
                                    <label className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={editingField.required}
                                            onChange={e => setEditingField({ ...editingField, required: e.target.checked })}
                                        />
                                        <span className="text-sm text-gray-700 font-medium">Required Field</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingField(null)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar: Collections */}
            <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
                {/* Project Header (Editable) */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Project</div>
                    {isEditingProject ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                className="w-full bg-white border border-blue-500 rounded px-2 py-1 text-sm font-bold text-gray-900 outline-none shadow-sm"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                onBlur={updateProjectName}
                                onKeyDown={(e) => e.key === 'Enter' && updateProjectName()}
                            />
                        </div>
                    ) : (
                        <div
                            onClick={() => setIsEditingProject(true)}
                            className="group flex items-center gap-2 cursor-pointer -ml-2 px-2 py-1 rounded hover:bg-white hover:shadow-sm transition-all"
                        >
                            <h1 className="font-bold text-gray-900 truncate">{projectName}</h1>
                            <Pencil className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                        </div>
                    )}
                </div>



                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Collections</h2>
                    <form onSubmit={createCollection} className="flex gap-2">
                        <input
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            placeholder="New Collection..."
                            value={newCollectionName}
                            onChange={e => setNewCollectionName(e.target.value)}
                        />
                        <button type="submit" disabled={!newCollectionName} className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50">
                            <Plus className="w-4 h-4" />
                        </button>
                    </form>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {collections.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedCollection(c)}
                            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${selectedCollection?.id === c.id
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <span>{c.name}</span>
                            <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingCollection(c); }}
                                    className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
                                    title="Rename Collection"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCollectionToDelete(c.id); }}
                                    className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors"
                                    title="Delete Collection"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main: Fields Editor */}
            <div className="flex-1 bg-gray-50 overflow-y-auto p-8">
                {selectedCollection ? (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">{selectedCollection.name}</h1>
                                <p className="text-sm text-gray-500">Configure the data structure for this collection.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsAIPanelOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 group"
                                >
                                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" /> AI Integrator
                                </button>
                                <div className="text-xs text-gray-400 font-mono">ID: {selectedCollection.id}</div>
                            </div>
                        </div>

                        {/* Field List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800">Fields</h3>
                            </div>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="divide-y divide-gray-100">
                                        {fields.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 text-sm">No fields defined yet.</div>
                                        ) : (
                                            fields.map(field => (
                                                <SortableFieldRow
                                                    key={field.id}
                                                    field={field}
                                                    setEditingField={setEditingField}
                                                    deleteField={deleteField}
                                                />
                                            ))
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-blue-500" /> Add New Field
                            </h3>
                            <form onSubmit={createField} className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-5">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Display Label</label>
                                    <input
                                        required
                                        placeholder="e.g. Track Title"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                        value={newField.label}
                                        onChange={e => setNewField({ ...newField, label: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-3">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Type</label>
                                    <select
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                        value={newField.type}
                                        onChange={e => setNewField({ ...newField, type: e.target.value as any })}
                                    >
                                        <option value="text">Text (Single Line)</option>
                                        <option value="longtext">Long Text (Multi-line)</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="date">Date</option>
                                        <option value="json">JSON</option>
                                        <option value="file">File</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex justify-center pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={newField.required}
                                                onChange={e => setNewField({ ...newField, required: e.target.checked })}
                                            />
                                            <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">Required</span>
                                    </label>
                                </div>
                                <div className="col-span-2">
                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
                                    >
                                        Add Field
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Settings className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select or create a collection to get started</p>
                    </div>
                )}
            </div>

            {/* Edit Collection Modal */}
            {editingCollection && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900">Rename Collection</h3>
                            <button onClick={() => setEditingCollection(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={updateCollection} className="space-y-4">
                            <input
                                autoFocus
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                                value={editingCollection.name}
                                onChange={e => setEditingCollection({ ...editingCollection, name: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingCollection(null)}
                                    className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI context Sidebar (Slide out from right) */}
            {isAIPanelOpen && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
                        onClick={() => setIsAIPanelOpen(false)}
                    />
                    <div className="relative w-full max-w-xl h-full bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-800 flex flex-col text-white">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">AI Integrator</h2>
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Universal Project Context</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAIPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">The "Seed" (Copy to ChatGPT/Claude)</span>
                                    <button
                                        onClick={copyToClipboard}
                                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copied ? 'Copied Context!' : 'Copy Seed'}
                                    </button>
                                </div>
                                <div className="bg-black/50 p-6 rounded-2xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-300 group relative">
                                    <pre className="whitespace-pre-wrap">{generateAIPrompt()}</pre>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <h3 className="text-sm font-bold text-white mb-2">How to use this</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                        This block of text contains your entire database schema and API instructions.
                                    </p>
                                    <ul className="space-y-3 text-xs text-slate-400">
                                        <li className="flex gap-2">
                                            <span className="text-emerald-400 font-bold">1.</span>
                                            <span>Copy the seed above.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-emerald-400 font-bold">2.</span>
                                            <span>Paste it into your AI chat along with your own source code.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-emerald-400 font-bold">3.</span>
                                            <span>Ask the AI to "Connect my code to my Built.at database".</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-950/50 border-t border-slate-800">
                            <button
                                onClick={copyToClipboard}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                {copied ? 'Copied to Clipboard' : 'Copy context for AI'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={collectionToDelete !== null}
                title="Delete Collection?"
                message="Warning: This will permanently delete all fields and all row data inside this collection. This cannot be undone."
                onCancel={() => setCollectionToDelete(null)}
                onConfirm={() => collectionToDelete && deleteCollection(collectionToDelete)}
            />
        </div>
    );
}

function ConfirmModal({ isOpen, onConfirm, onCancel, title, message }: {
    isOpen: boolean,
    onConfirm: () => void,
    onCancel: () => void,
    title: string,
    message: string
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h3>
                    <p className="text-gray-500 text-center text-sm">{message}</p>
                </div>
                <div className="flex bg-gray-50 p-4 gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
