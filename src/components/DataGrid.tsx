import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, Collection, Field, Row } from '../types/schema';
import { Plus, Trash2, GripVertical, Settings, AlertTriangle, X, Sparkles, Copy, Check } from 'lucide-react';

// DnD Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DataGridProps {
    project: Project;
}

// Sortable Row Component
function SortableRow({ row, fields, onDelete, onUpdateCell }: {
    row: Row,
    fields: Field[],
    onDelete: (id: string) => void,
    onUpdateCell: (rowId: string, fieldName: string, value: any) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        position: 'relative' as const,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`border-b border-gray-100 hover:bg-gray-50 group border-l-4 ${isDragging ? 'bg-blue-50 border-l-blue-500 shadow-lg' : 'border-l-transparent bg-white'}`}
        >
            <td className="py-3 pl-4 pr-0 w-10 text-gray-300">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:text-gray-500 p-1 rounded">
                    <GripVertical className="w-4 h-4" />
                </button>
            </td>
            {fields.map(field => (
                <td key={field.id} className="py-3 px-6 text-sm text-gray-700">
                    <CellValue
                        value={row.data[field.name]}
                        type={field.type}
                        onUpdate={(val) => onUpdateCell(row.id, field.name, val)}
                    />
                </td>
            ))}
            <td className="py-3 px-6 text-right w-16">
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(row.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

import { Loader2, Upload } from 'lucide-react';

function FileCell({ value, onUpload }: { value: string, onUpload: (file: File) => Promise<void> }) {
    const [uploading, setUploading] = useState(false);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await onUpload(file);
        } catch (err) {
            console.error(err);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    }

    if (uploading) return <div className="flex items-center gap-2 text-xs text-blue-600"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</div>;

    if (value) {
        // Is it an image?
        const isImage = value.match(/\.(jpeg|jpg|gif|png)$/i) != null;

        return (
            <div className="flex items-center gap-2 group">
                {isImage && <img src={value} className="w-6 h-6 rounded object-cover border border-gray-200" />}
                <a href={value} target="_blank" className="text-blue-600 hover:underline truncate max-w-[200px] text-xs font-mono block" title={value}>
                    {(() => {
                        const fileName = value.split('/').pop() || '';
                        // Remove the timestamp prefix (e.g. 123456789_file.mp3 -> file.mp3)
                        return fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName;
                    })()}
                </a>
                <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded">
                    <input type="file" className="hidden" onChange={handleFileChange} />
                    <Upload className="w-3 h-3 text-gray-400" />
                </label>
            </div>
        );
    }

    return (
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded text-xs transition-colors border border-gray-200 border-dashed">
            <Upload className="w-3 h-3" />
            <span>Upload</span>
            <input type="file" className="hidden" onChange={handleFileChange} />
        </label>
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

// Editable Cell for Text/Numbers
function EditableTextCell({ value, type, onUpdate }: { value: any, type: string, onUpdate: (val: any) => void }) {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => { setLocalValue(value || ''); }, [value]);

    return (
        <input
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-500 rounded px-2 py-1 outline-none text-sm transition-all"
            value={localValue}
            type={type === 'number' ? 'number' : 'text'}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                if (localValue !== value) onUpdate(localValue);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                }
            }}
        />
    );
}

// Editable Cell for Long Text (Textarea)
function EditableLongTextCell({ value, onUpdate }: { value: any, onUpdate: (val: any) => void }) {
    const [localValue, setLocalValue] = useState(value || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { setLocalValue(value || ''); }, [value]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [localValue]);

    return (
        <textarea
            ref={textareaRef}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-500 rounded px-2 py-1 outline-none text-sm transition-all resize-none overflow-hidden min-h-[32px] block"
            value={localValue}
            rows={1}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                if (localValue !== value) onUpdate(localValue);
            }}
        />
    );
}

function CellValue({ value, type, onUpdate }: { value: any, type: string, onUpdate?: (val: any) => void }) {
    // 1. FILE TYPE
    if (type === 'file' && onUpdate) {
        return <FileCell value={value} onUpload={async (file) => {
            const path = `${Date.now()}_${file.name}`;
            const { error } = await supabase.storage.from('built_flexdata').upload(path, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('built_flexdata').getPublicUrl(path);
            onUpdate(publicUrl);
        }} />;
    }

    // 2. BOOLEAN TYPE
    if (type === 'boolean') {
        return (
            <button
                onClick={() => onUpdate && onUpdate(!value)}
                className={`px-2 py-0.5 rounded text-xs font-bold ${value ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
            >
                {value ? 'YES' : 'NO'}
            </button>
        );
    }

    // 3. EDITABLE TEXT/NUMBER
    if ((type === 'text' || type === 'number') && onUpdate) {
        return <EditableTextCell value={value} type={type} onUpdate={onUpdate} />;
    }

    // 4. LONG TEXT
    if (type === 'longtext' && onUpdate) {
        return <EditableLongTextCell value={value} onUpdate={onUpdate} />;
    }

    // Fallback View-Only
    if (value === null || value === undefined) return <span className="text-gray-300 italic text-xs">empty</span>;
    if (typeof value === 'object') return <pre className="text-xs bg-gray-100 p-1 rounded max-w-[200px] overflow-hidden">{JSON.stringify(value)}</pre>;

    return <span className="truncate max-w-[200px] block text-sm">{String(value)}</span>;
}

export function DataGrid({ project }: DataGridProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [fields, setFields] = useState<Field[]>([]);
    const [rows, setRows] = useState<Row[]>([]);
    const [newRowData, setNewRowData] = useState<Record<string, any>>({});

    // Modals & Panels State
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isUploadingNew, setIsUploadingNew] = useState(false);

    useEffect(() => {
        fetchCollections();
    }, [project.id]);

    useEffect(() => {
        if (selectedCollection) {
            fetchSchemaAndData(selectedCollection.id);
        }
    }, [selectedCollection]);

    // Keyboard Shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // 1. Open New Item Panel ('n' when not in input)
            if (e.key.toLowerCase() === 'n' && !isAddPanelOpen && !rowToDelete) {
                const activeEl = document.activeElement;
                const isInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
                if (!isInput) {
                    e.preventDefault();
                    setIsAddPanelOpen(true);
                }
            }

            // 2. Submit / Close Panel when open
            if (isAddPanelOpen) {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    const form = document.querySelector('form');
                    if (form) form.requestSubmit();
                }
                if (e.key === 'Escape') {
                    setIsAddPanelOpen(false);
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAddPanelOpen, rowToDelete]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    async function fetchCollections() {
        const { data } = await supabase.schema('built_flexdata').from('collections').select('*').eq('project_id', project.id).order('created_at');
        setCollections(data || []);
        if (data && data.length > 0 && !selectedCollection) setSelectedCollection(data[0]);
    }

    async function fetchSchemaAndData(collectionId: string) {
        // 1. Get Fields
        const { data: fieldsData } = await supabase
            .schema('built_flexdata')
            .from('fields')
            .select('*')
            .eq('collection_id', collectionId)
            // Display: Label first logic could technically be here, but we just use creation order for columns now
            .order('created_at');

        setFields(fieldsData || []);

        // 2. Get Rows (Ordered by sort_order)
        const { data: rowsData } = await supabase
            .schema('built_flexdata')
            .from('rows')
            .select('*')
            .eq('collection_id', collectionId)
            .order('sort_order', { ascending: true }) // CRITICAL: Use new column
            .order('created_at', { ascending: true }); // Fallback

        setRows(rowsData || []);
    }

    // Helper for "Add Row" file uploads
    async function handleNewRowFileUpload(e: React.ChangeEvent<HTMLInputElement>, fieldName: string) {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingNew(true);
        try {
            const path = `${Date.now()}_${file.name}`;
            const { error } = await supabase.storage.from('built_flexdata').upload(path, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('built_flexdata').getPublicUrl(path);

            setNewRowData(prev => ({ ...prev, [fieldName]: publicUrl }));
        } catch (err: any) {
            console.error(err);
            alert("Upload failed: " + (err.message || 'Unknown error'));
        } finally {
            setIsUploadingNew(false);
        }
    }

    async function addRow(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCollection) return;

        // Validation: Check required fields
        const missingFields = fields.filter(f => f.required && !newRowData[f.name]);
        if (missingFields.length > 0) {
            alert(`Missing required fields: ${missingFields.map(f => f.label).join(', ')}`);
            return;
        }

        // Validation: Check if at least one field has data (if no fields were marked required)
        const hasData = Object.keys(newRowData).length > 0;
        if (!hasData) {
            alert("Please fill in at least one field.");
            return;
        }

        // Calculate new sort order (last + 1)
        const maxSort = rows.length > 0 ? Math.max(...rows.map(r => r.sort_order || 0)) : 0;

        const { data, error } = await supabase
            .schema('built_flexdata')
            .from('rows')
            .insert([{
                collection_id: selectedCollection.id,
                data: newRowData,
                sort_order: maxSort + 1000
            }])
            .select()
            .single();

        if (error) {
            console.error("Add Row Error:", error);
            alert("Failed to add row: " + error.message);
            return;
        }

        if (data) {
            setRows(prev => [...prev, data]);
            setNewRowData({});
            setIsAddPanelOpen(false);
        }
    }

    async function deleteRow(id: string) {
        console.log("Proceeding with Supabase DELETE request for ID:", id);
        try {
            const { error } = await supabase.schema('built_flexdata').from('rows').delete().eq('id', id);

            if (error) {
                console.error('SUPABASE DELETE ERROR:', error);
                alert(`Failed to delete row: ${error.message} (${error.code})`);
                return;
            }

            console.log("Delete successful in DB. Filtering local state...");
            setRows(prev => prev.filter(r => r.id !== id));
            setRowToDelete(null); // Close modal
            console.log("State updated.");
        } catch (err: any) {
            console.error("CRITICAL ERROR in deleteRow:", err);
            alert("An unexpected error occurred: " + err.message);
        }
    }

    // RENDER HELPER FOR ADD ROW INPUTS
    function renderAddInput(field: Field, autoFocus?: boolean) {
        if (field.type === 'file') {
            return (
                <div className="relative">
                    <input
                        type="file"
                        id={`new-${field.id}`}
                        className="hidden"
                        onChange={(e) => handleNewRowFileUpload(e, field.name)}
                    />
                    <label
                        htmlFor={`new-${field.id}`}
                        className={`block w-full px-3 py-2 border rounded-lg text-sm cursor-pointer truncate ${newRowData[field.name] ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                    >
                        {isUploadingNew ? 'Uploading...' : (
                            newRowData[field.name] ? (
                                (() => {
                                    const val = newRowData[field.name];
                                    const fileName = val.split('/').pop() || '';
                                    return fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName;
                                })()
                            ) : `Upload ${field.label}...`
                        )}
                    </label>
                </div>
            );
        }

        if (field.type === 'boolean') {
            return (
                <select
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    onChange={e => setNewRowData({ ...newRowData, [field.name]: e.target.value === 'true' })}
                >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                </select>
            );
        }

        if (field.type === 'longtext') {
            return (
                <textarea
                    autoFocus={autoFocus}
                    required={field.required}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[80px]"
                    placeholder={field.label || undefined}
                    value={newRowData[field.name] || ''}
                    onChange={e => setNewRowData({ ...newRowData, [field.name]: e.target.value })}
                />
            );
        }

        return (
            <input
                autoFocus={autoFocus}
                required={field.required}
                type={field.type === 'number' ? 'number' : 'text'}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder={field.label || undefined}
                value={newRowData[field.name] || ''}
                onChange={e => setNewRowData({ ...newRowData, [field.name]: e.target.value })}
            />
        );
    }

    // --- LIVE CELL UPDATER ---
    async function updateCell(rowId: string, fieldKey: string, newValue: any) {
        // 1. Optimistic Update
        setRows(rows.map(r => {
            if (r.id === rowId) {
                return { ...r, data: { ...r.data, [fieldKey]: newValue } };
            }
            return r;
        }));

        // 2. DB Update
        // We have to fetch the row first to merge? Or just rely on Supabase to patch the JSON?
        // Supabase update on JSONB replaces the whole object usually unless we use a specialized function.
        // For safety, we find the row in our local state (which we just updated!)
        const row = rows.find(r => r.id === rowId);
        if (!row) return;

        const newData = { ...row.data, [fieldKey]: newValue };
        await supabase.schema('built_flexdata').from('rows').update({ data: newData }).eq('id', rowId);
    }

    // --- DRAG END HANDLER ---
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setRows((items) => {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            const newOrder = arrayMove(items, oldIndex, newIndex);

            // Persist to DB
            // We need to calculate the new sort_order value.
            // Strategy: Take the average of the neighbors.
            const movedItem = newOrder[newIndex];
            const prevItem = newOrder[newIndex - 1];
            const nextItem = newOrder[newIndex + 1];

            let newSortOrder = 0;
            if (!prevItem && !nextItem) newSortOrder = 1000; // Only item
            else if (!prevItem) newSortOrder = (nextItem.sort_order || 0) / 2; // Check if first
            else if (!nextItem) newSortOrder = (prevItem.sort_order || 0) + 1000; // Check if last
            else newSortOrder = ((prevItem.sort_order || 0) + (nextItem.sort_order || 0)) / 2; // Middle

            // Update Local State immediately for responsiveness
            movedItem.sort_order = newSortOrder;

            // Update DB async
            supabase
                .schema('built_flexdata')
                .from('rows')
                .update({ sort_order: newSortOrder })
                .eq('id', movedItem.id)
                .then(({ error }) => {
                    if (error) console.error("Sort failed", error);
                });

            return newOrder;
        });
    }

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

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-4">
                <h2 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Collections</h2>
                <div className="flex-1 overflow-y-auto space-y-0.5 px-2">
                    {collections.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCollection(c)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCollection?.id === c.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 overflow-hidden flex flex-col p-6">
                {selectedCollection ? (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{selectedCollection.name}</h1>
                                <p className="text-sm text-gray-500">Manage and edit your collection data.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsAIPanelOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 group"
                                >
                                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" /> AI Integrator
                                </button>
                                <button
                                    onClick={() => setIsAddPanelOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 group"
                                    title="Shortcut: N"
                                >
                                    <Plus className="w-4 h-4" /> New Item
                                    <span className="hidden group-hover:inline-block ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded border border-white/30 font-mono">[N]</span>
                                </button>
                            </div>
                        </div>

                        {/* Table Area */}
                        <div className="flex-1 overflow-auto">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="py-3 pl-4 w-10"></th>
                                                {fields.map(f => (
                                                    <th key={f.id} className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        {f.label}
                                                    </th>
                                                ))}
                                                <th className="w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                                {rows.map(row => (
                                                    <SortableRow
                                                        key={row.id}
                                                        row={row}
                                                        fields={fields}
                                                        onDelete={(id) => setRowToDelete(id)}
                                                        onUpdateCell={updateCell}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </tbody>
                                    </table>
                                </DndContext>
                            </div>
                        </div>

                        {/* Add Row Sidebar (Slide out from right) */}
                        {isAddPanelOpen && (
                            <div className="fixed inset-0 z-50 flex justify-end">
                                {/* Backdrop */}
                                <div
                                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
                                    onClick={() => setIsAddPanelOpen(false)}
                                />
                                {/* Panel */}
                                <div className="relative w-full max-w-md h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 border-l border-gray-100 flex flex-col">
                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">New Item</h2>
                                            <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mt-1">{selectedCollection.name}</p>
                                        </div>
                                        <button onClick={() => setIsAddPanelOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <X className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>

                                    <form onSubmit={addRow} className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="space-y-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                                                </label>
                                                <div className="transition-all duration-200 focus-within:translate-x-1">
                                                    {renderAddInput(field, index === 0)}
                                                </div>
                                            </div>
                                        ))}
                                    </form>

                                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddPanelOpen(false)}
                                            className="flex-1 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={addRow}
                                            disabled={Object.keys(newRowData).length === 0 && !isUploadingNew}
                                            className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                            title="Shortcut: Cmd + Enter"
                                        >
                                            Save Item
                                            <span className="text-[10px] opacity-50 font-mono">⌘↵</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI context Sidebar (Slide out from right) */}
                        {isAIPanelOpen && (
                            <div className="fixed inset-0 z-50 flex justify-end">
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

                        {/* Custom Confirm Modal */}
                        <ConfirmModal
                            isOpen={rowToDelete !== null}
                            title="Delete Row?"
                            message="This action cannot be undone. All data in this row will be permanently removed."
                            onCancel={() => setRowToDelete(null)}
                            onConfirm={() => rowToDelete && deleteRow(rowToDelete)}
                        />
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Settings className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a collection to view data</p>
                    </div>
                )}
            </div>
        </div>
    );
}
