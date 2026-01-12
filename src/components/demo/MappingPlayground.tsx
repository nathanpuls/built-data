import { useState, useEffect } from 'react';
import { ArrowRight, Database, Code2, Link as LinkIcon, CheckCircle2, Play, Table } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useParams } from 'react-router-dom';
import type { Collection, Field, Row } from '../../types/schema';
import VoiceClipsPlayer from '../voice-demo/VoiceClipsPlayer';
import type { Track } from '../voice-demo/VoiceClipsPlayer';

export function MappingPlayground() {
    const { projectId } = useParams();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [fields, setFields] = useState<Field[]>([]);
    const [previewRows, setPreviewRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [outputTab, setOutputTab] = useState<'iframe' | 'vanilla' | 'ai'>(
        window.location.pathname.includes('ai-integrator') ? 'ai' : 'iframe'
    );

    const [mapping, setMapping] = useState<Record<string, string>>({
        title: '',
        audio: '',
        cover: ''
    });

    const developerSlots = [
        { key: 'title', label: 'Song Title', type: 'Text' },
        { key: 'audio', label: 'Audio File', type: 'URL' },
        { key: 'cover', label: 'Cover Art', type: 'Image' },
    ];

    useEffect(() => {
        async function loadInitial() {
            if (!projectId) return;

            const { data: cols } = await supabase
                .schema('built_flexdata')
                .from('collections')
                .select('*')
                .eq('project_id', projectId);

            setCollections(cols || []);
            if (cols && cols.length > 0) {
                // Try to find a logical audio collection
                const found = cols.find(c => ['songs', 'tracks', 'audio', 'voice_clips', 'clips'].includes(c.name.toLowerCase())) || cols[0];
                setSelectedCollection(found);
            }
            setLoading(false);
        }
        loadInitial();
    }, [projectId]);

    useEffect(() => {
        async function loadCollectionData() {
            if (!selectedCollection) return;

            // 1. Get Fields
            const { data: fieldData } = await supabase
                .schema('built_flexdata')
                .from('fields')
                .select('*')
                .eq('collection_id', selectedCollection.id);
            setFields(fieldData || []);

            // 2. Get 3 sample rows for preview
            const { data: rowData } = await supabase
                .schema('built_flexdata')
                .from('rows')
                .select('*')
                .eq('collection_id', selectedCollection.id)
                .limit(3);
            setPreviewRows(rowData || []);

            // 3. Attempt Auto-Mapping
            if (fieldData) {
                const newMapping = { ...mapping };
                const titleField = fieldData.find(f => ['title', 'name', 'track', 'label'].includes(f.label?.toLowerCase() || ''));
                const audioField = fieldData.find(f => ['url', 'audio', 'file', 'link', 'mp3', 'source'].includes(f.label?.toLowerCase() || ''));
                const coverField = fieldData.find(f => ['image', 'art', 'cover', 'thumbnail', 'photo'].includes(f.label?.toLowerCase() || ''));

                if (titleField) newMapping.title = titleField.name;
                if (audioField) newMapping.audio = audioField.name;
                if (coverField) newMapping.cover = coverField.name;
                setMapping(newMapping);
            }
        }
        loadCollectionData();
    }, [selectedCollection]);

    const generateUrl = () => {
        const baseUrl = `${window.location.origin}/embed/audio/${projectId}`;
        const params = new URLSearchParams();
        if (selectedCollection) params.set('collection_id', selectedCollection.id);
        if (mapping.title) params.set('title_field', mapping.title);
        if (mapping.audio) params.set('url_field', mapping.audio);
        // Cover field mapping support can be added to AudioEmbed too if needed
        return `${baseUrl}?${params.toString()}`;
    };

    // Construct preview tracks for the player
    const previewTracks: Track[] = previewRows.map(r => ({
        id: r.id,
        name: r.data[mapping.title] || 'Untitled',
        url: r.data[mapping.audio] || '',
        clips: [{ name: 'Full Audio', start: 0, end: 999999 }]
    })).filter(t => t.url);

    const generateFullTemplate = () => {
        const proxyUrl = `http://localhost:3001/api/v1/${projectId}/${selectedCollection?.id}`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Custom Builder App</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-10">
    <div class="max-w-4xl mx-auto space-y-10">
        
        <!-- APPROACH 1: THE IFRAME EMBED (Easiest) -->
        <section class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 class="text-xl font-bold mb-4">1. The Embedded Player</h2>
            <iframe 
                src="${generateUrl()}" 
                width="100%" 
                height="400" 
                frameborder="0" 
                class="rounded-xl border border-gray-100"
            ></iframe>
        </section>

        <!-- APPROACH 2: THE BUILT.AT API (Clean) -->
        <section class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 class="text-xl font-bold mb-4">2. Custom Raw Data List</h2>
            <div id="song-list" class="space-y-4">
                <p class="text-gray-400 italic">Fetching data via Built.at API...</p>
            </div>
        </section>

    </div>

    <script type="module">
        const API_URL = "${proxyUrl}";
        const MAPPING = {
            title: "${mapping.title}",
            audio: "${mapping.audio}"
        };

        async function init() {
            // No auth headers needed! The proxy handles it.
            const response = await fetch(API_URL);
            const { results } = await response.json();

            const listContainer = document.getElementById('song-list');
            listContainer.innerHTML = '';

            results.forEach(data => {
                const title = data[MAPPING.title] || 'Untitled';
                const url = data[MAPPING.audio] || '#';

                const el = document.createElement('div');
                el.className = "flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow";
                el.innerHTML = \`
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">▶</div>
                        <span class="font-bold text-gray-800 text-lg">\${title}</span>
                    </div>
                    <a href="\${url}" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200">Download</a>
                \`;
                listContainer.appendChild(el);
            });
        }

        init();
    </script>
</body>
</html>`;
    };

    const generateAIPrompt = () => {
        const proxyBase = `http://localhost:3001/api/v1/${projectId}`;
        return `I am using Built.at (a Headless CMS) for my project. 
Please act as an Integration Specialist. I will provide you with my existing code, and I want you to help me connect it to my Built.at database.

### PROJECT CONTEXT:
- Project ID: ${projectId}
- Base API URL: ${proxyBase}

### DATA SCHEMA:
- Collection: "${selectedCollection?.name}" (ID: ${selectedCollection?.id})
- Field Mapping Guide (Label -> Internal Key):
${fields.map(f => `  * "${f.label || f.name}": row.data["${f.name}"] (${f.type})`).join('\n')}

### DATA STRUCTURE:
The API returns a JSON object with a "results" array. 
Each item in the array is a data object. To access a value, you MUST use the internal keys provided above.
Example: const title = item["${mapping.title || fields[0]?.name || 'field_key'}"];

### MY GOAL:
I am going to paste my current source code below. 
1. Identify all hardcoded text, images, or audio links.
2. Replace them with dynamic 'placeholders' that fetch from ${selectedCollection?.name}.
3. IMPORTANT: Use the internal gibberish keys from the schema above (e.g. item["${fields[0]?.name || 'uuid_key'}"]) not the labels.

---
PASTE YOUR CODE BELOW THIS LINE:`;
    };

    if (loading) return <div className="p-8">Loading Playground...</div>;

    return (
        <div className="flex h-full bg-gray-50 flex-col overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Mapping Playground</h1>
                    <p className="text-gray-500 text-sm max-w-2xl">
                        Connect your custom collection fields to the Audio Player's requirements.
                    </p>
                </div>
                {selectedCollection && (
                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl text-blue-700 border border-blue-100">
                        <Table className="w-4 h-4" />
                        <select
                            value={selectedCollection.id}
                            onChange={(e) => setSelectedCollection(collections.find(c => c.id === e.target.value) || null)}
                            className="bg-transparent font-bold focus:outline-none"
                        >
                            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUMN 1: THE DEVELOPER */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2 px-1">
                        <Code2 className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">The Developer's Requirement</h2>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative">
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white p-2 rounded-full border border-gray-100 hidden lg:block shadow-md">
                            <ArrowRight className="w-4 h-4 text-gray-300" />
                        </div>

                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            Generic Audio Player
                        </h3>
                        <div className="space-y-4">
                            {developerSlots.map(slot => (
                                <div key={slot.key} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                                    <div>
                                        <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">NEEDS FIELD</span>
                                        <span className="font-bold text-indigo-900">{slot.label}</span>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: THE MAPPING (THE MAGIC) */}
                <div className="space-y-4 relative">
                    <div className="flex items-center gap-2 text-purple-600 mb-2 px-1">
                        <LinkIcon className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">The Mapping Bridge</h2>
                    </div>

                    <div className="bg-white border-2 border-purple-500 rounded-2xl p-6 shadow-xl shadow-purple-50 ring-4 ring-purple-50">
                        <h3 className="font-bold text-gray-900 mb-6 text-center">Connect Your Data</h3>

                        <div className="space-y-6">
                            {developerSlots.map(slot => (
                                <div key={slot.key} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-gray-400 uppercase tracking-tight">{slot.label}</span>
                                        <span className="text-purple-600 font-mono">?{slot.key === 'audio' ? 'url' : slot.key}_field=</span>
                                    </div>
                                    <select
                                        value={mapping[slot.key]}
                                        onChange={(e) => setMapping({ ...mapping, [slot.key]: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-purple-400 focus:border-purple-600 focus:ring-4 focus:ring-purple-50 transition-all font-bold text-gray-700"
                                    >
                                        <option value="">Select Field...</option>
                                        {fields.map(f => (
                                            <option key={f.id} value={f.name}>{f.label} ({f.type})</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-emerald-600 mb-4 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold w-fit">
                                <Play className="w-3 h-3" /> Live Mapping Preview
                            </div>
                            {previewTracks.length > 0 ? (
                                <div className="transform scale-75 origin-top -mb-[25%] pointer-events-none opacity-80">
                                    <VoiceClipsPlayer tracks={previewTracks} themeColor="#8B5CF6" />
                                </div>
                            ) : (
                                <div className="h-40 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm text-center p-4">
                                    Select fields to see a live preview
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: THE USER DATABASE */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2 px-1">
                        <Database className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">Actual Collection Rows</h2>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative">
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white p-2 rounded-full border border-gray-100 hidden lg:block shadow-md">
                            <ArrowRight className="w-4 h-4 text-gray-300 transform rotate-180 lg:rotate-0" />
                        </div>

                        <h3 className="font-bold text-emerald-900 mb-4">Sample Data: "{selectedCollection?.name}"</h3>
                        <div className="space-y-4">
                            {previewRows.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm italic">
                                    No rows found in this collection.
                                </div>
                            ) : (
                                previewRows.map((row, i) => (
                                    <div key={row.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs font-mono space-y-1.5">
                                        <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-2">
                                            <span className="text-gray-400">ITEM #{i + 1}</span>
                                            <span className="text-[10px] text-gray-300">{row.id.slice(0, 8)}</span>
                                        </div>
                                        {Object.entries(row.data).map(([key, val]) => (
                                            <div key={key} className={`flex items-start gap-2 ${Object.values(mapping).includes(key) ? 'bg-purple-100/50' : ''}`}>
                                                <span className="text-emerald-600 font-bold min-w-[80px]">{fields.find(f => f.name === key)?.label || key}:</span>
                                                <span className="text-gray-500 truncate">{String(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* FOOTER: THE RESULT */}
            <div className="bg-gray-950 text-white p-8 border-t border-gray-800">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-400 w-6 h-6" />
                            <h2 className="text-2xl font-bold">Developer Implementation</h2>
                        </div>
                        <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-xl">
                            <button
                                onClick={() => setOutputTab('iframe')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${outputTab === 'iframe' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                IFRAME (EMBED)
                            </button>
                            <button
                                onClick={() => setOutputTab('vanilla')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${outputTab === 'vanilla' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                VANILLA JS (CUSTOM)
                            </button>
                            <button
                                onClick={() => setOutputTab('ai')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${outputTab === 'ai' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                AI PROMPT ✨
                            </button>
                        </div>
                    </div>

                    {outputTab === 'iframe' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-300">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">HTML Embed Code</span>
                                    <button onClick={() => navigator.clipboard.writeText(`<iframe src="${generateUrl()}" width="100%" height="600" frameborder="0"></iframe>`)} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase">Copy HTML</button>
                                </div>
                                <div className="bg-black/50 p-6 rounded-2xl font-mono text-sm break-all text-blue-300 border border-gray-800 shadow-inner relative group">
                                    <pre className="whitespace-pre-wrap">
                                        {`<iframe 
  src="${generateUrl()}" 
  width="100%" 
  height="600" 
  frameborder="0"
  allow="autoplay"
  loading="lazy"
></iframe>`}
                                    </pre>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-gray-400 leading-relaxed italic">
                                    "This is the easiest way. You don't have to write any code. Just paste the iframe, and because you mapped the fields above, our player knows exactly where to find your data."
                                </div>
                            </div>

                            <div className="space-y-4 font-mono text-xs">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Mapping Summary (URL Params)</span>
                                <div className="space-y-3">
                                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 flex justify-between">
                                        <span className="text-gray-400">?title_field=</span>
                                        <span className="text-blue-400 font-bold">{mapping.title}</span>
                                    </div>
                                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 flex justify-between">
                                        <span className="text-gray-400">?url_field=</span>
                                        <span className="text-blue-400 font-bold">{mapping.audio}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-2 px-1">
                                        Our embed player reads these params and uses them as keys to access your <code>row.data</code> object dynamically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : outputTab === 'vanilla' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-300">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Full HTML Template (index.html)</span>
                                    <button onClick={() => navigator.clipboard.writeText(generateFullTemplate())} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase">Copy Template</button>
                                </div>
                                <div className="bg-black/50 p-6 rounded-2xl font-mono text-[11px] text-gray-400 border border-gray-800 shadow-inner h-[400px] overflow-y-auto">
                                    <pre>{generateFullTemplate()}</pre>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2">How it works (The Headless Secret)</h3>
                                    <p className="text-gray-400 text-xs leading-relaxed">
                                        When building a custom Vanilla JS app, you use <b>Dynamic Property Access</b>. Instead of hardcoding <code>data.title</code>, you use the mapping variables:
                                    </p>
                                </div>
                                <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30">
                                    <code className="text-purple-300 block text-xs">
                                        <span className="text-gray-500">// HARDCODED (Bad - tool only works for one person)</span><br />
                                        const title = row.data.song_title;<br /><br />
                                        <span className="text-emerald-400">// DYNAMIC (Good - tool is generic/headless)</span><br />
                                        const titleField = "song_title"; <span className="text-gray-500">// from your map!</span><br />
                                        const title = row.data[titleField];
                                    </code>
                                </div>
                                <p className="text-gray-500 text-xs">
                                    This simple JavaScript trick is what allows your tool to fit into any builder's database perfectly.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-300">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Universal Project Context (The "Seed")</span>
                                    <button onClick={() => navigator.clipboard.writeText(generateAIPrompt())} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase">Copy "Seed" For AI</button>
                                </div>
                                <div className="bg-emerald-950/20 p-8 rounded-2xl font-medium text-gray-300 border border-emerald-500/30 relative group shadow-2xl">
                                    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed font-mono">
                                        {generateAIPrompt()}
                                    </pre>
                                    <div className="absolute top-4 right-4 text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity">
                                        <Database className="w-12 h-12" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center space-y-8">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        The AI "Brain Transplant"
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Don't just build a new widget. **Inject your database into your existing code.**
                                        <br /><br />
                                        1. **Copy the "Seed"** (Left)<br />
                                        2. **Paste it** into a chat with ChatGPT/Claude.<br />
                                        3. **Paste your own code** (React, Svelte, etc.) right after it.<br />
                                        4. **Ask the AI** to "Connect this code to my Built.at database."
                                    </p>
                                </div>

                                <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 italic">
                                    "The AI will automatically find your hardcoded 'Summer Vibes' text and replace it with a dynamic variable from your specific schema."
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
