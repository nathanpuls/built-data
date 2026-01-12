import { useState, useEffect } from 'react';
import { Share2, Code2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useParams } from 'react-router-dom';
import VoiceClipsPlayer from '../voice-demo/VoiceClipsPlayer';
import type { Track } from '../voice-demo/VoiceClipsPlayer';

const DEVELOPER_CODE = `
// 1. Fetch generic "rows" from your collection
const { data: rows } = await supabase
  .from('rows').select('*').eq('collection_id', 'YOUR_ID');

// 2. THE IMPORTANT PART: MAPPING
// Connect YOUR database fields (right) to YOUR player's props (left)
const tracks = rows.map(row => ({
  // Player Prop   <--   Database Field
  title:                 row.data.track_title,  
  audioSrc:              row.data.url,
  coverImage:            row.data.album_art
}));

// 3. Pass formatted data to your custom component
return <MyCustomPlayer tracks={tracks} />;
`;

export function AudioPlayerDemo() {
    const { projectId } = useParams();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    // Customization State
    const [themeColor, setThemeColor] = useState('#2563EB');

    // FETCH DATA & Settings
    useEffect(() => {
        async function loadProjectAndData() {
            if (!projectId) return;

            // 1. Get Collections
            const { data: collections } = await supabase
                .schema('built_flexdata')
                .from('collections')
                .select('id, name')
                .eq('project_id', projectId);

            if (!collections) {
                setLoading(false);
                return;
            }

            // 2. Get theme from "settings" collection if it exists
            const settingsCol = collections.find(c =>
                ['settings', 'config', 'branding', 'configuration'].includes(c.name.toLowerCase())
            );

            if (settingsCol) {
                const { data: settingsRows } = await supabase
                    .schema('built_flexdata')
                    .from('rows')
                    .select('data')
                    .eq('collection_id', settingsCol.id);

                if (settingsRows && settingsRows.length > 0) {
                    // Try to find a row that HAS the color, or IS the color setting
                    let colorValue = null;

                    for (const row of settingsRows) {
                        const d = row.data;
                        // Case 1: The row has a property for color
                        const val = d.theme_color || d.color || d.brand_color || d.primary_color || d.hex || d.value;

                        // Case 2: The row is a key/value pair and this row is the theme color
                        const isColorKey = (d.key || d.name || d.label || "").toString().toLowerCase().includes('theme color');

                        if (isColorKey && (d.value || d.color)) {
                            colorValue = d.value || d.color;
                            break;
                        }

                        if (val && val.toString().startsWith('#')) {
                            colorValue = val;
                        }
                    }

                    if (colorValue) setThemeColor(colorValue);
                }
            }

            // 3. Get Tracks
            const songCollection = collections.find(c =>
                ['songs', 'tracks', 'episodes', 'audio', 'voice_clips', 'clips', 'portfolio', 'music'].includes(c.name.toLowerCase())
            );

            if (!songCollection) {
                setLoading(false);
                return;
            }

            const { data: rows } = await supabase
                .schema('built_flexdata')
                .from('rows')
                .select('id, data')
                .eq('collection_id', songCollection.id)
                .order('sort_order', { ascending: true });

            const formattedTracks: Track[] = rows?.map(r => ({
                id: r.id,
                name: r.data.title || r.data.name || r.data.track_title || r.data.label || r.data.track || r.data.song_name || 'Untitled',
                url: r.data.url || r.data.audio_url || r.data.file || r.data.audio_file || r.data.audio || r.data.song || r.data.mp3 || r.data.link || r.data.source || '',
                clips: Array.isArray(r.data.clips) ? r.data.clips : [
                    { name: 'Full Audio', start: 0, end: 999999 }
                ]
            })).filter(t => t.url) || [];

            setTracks(formattedTracks);
            setLoading(false);
        }

        loadProjectAndData();
    }, [projectId]);

    // Update URL when themeColor changes
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (themeColor !== '#2563EB') {
            params.set('theme', themeColor);
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({}, '', newUrl);
        }
    }, [themeColor]);


    // Tabs for the code sidebar
    const [activeTab, setActiveTab] = useState<'iframe' | 'react'>('iframe'); // Default to Embed

    // Construct Snippet with Mapping explanation
    const embedUrl = `${window.location.origin}/embed/audio/${projectId}?theme=${encodeURIComponent(themeColor)}&title_field=track_title&url_field=url`;
    const IFRAME_CODE = `
<!-- 
  Flexible Configuration:
  ?theme = Hex Color
  ?title_field = Your DB column for the song name
  ?url_field = Your DB column for the audio file
-->
<iframe 
  src="${embedUrl}"
  width="100%" 
  height="600" 
  frameborder="0" 
  allow="autoplay" 
  loading="lazy"
  style="border-radius: 12px; border: 1px solid #e5e7eb;"
></iframe>
`;

    if (loading) return <div className="p-8 text-gray-400">Loading demo...</div>;

    return (
        <div className="flex h-full bg-gray-50">
            {/* LEFT: THE APP PREVIEW */}
            <div className="flex-1 p-8 flex flex-col items-center border-r border-gray-200 overflow-y-auto">
                <div className="w-full max-w-md mb-6 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Live Preview</h2>
                    {/* Brand Badge */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: themeColor }}></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project Brand Color</span>
                    </div>
                </div>

                {tracks.length === 0 ? (
                    <div className="text-center max-w-md">
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 mb-6 text-left text-sm">
                            <p className="font-bold mb-2">No tracks found!</p>
                            <p>Create a <code>songs</code> or <code>voice_clips</code> collection.</p>
                        </div>
                    </div>
                ) : (
                    <VoiceClipsPlayer tracks={tracks} themeColor={themeColor} />
                )}
            </div>

            {/* RIGHT: THE CODE */}
            <div className="w-[500px] bg-[#1e1e1e] flex flex-col p-6 overflow-hidden border-l border-gray-800">
                <h2 className="text-white font-bold mb-6 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-blue-400" /> Integration
                </h2>

                {/* Toggle Tabs */}
                <div className="flex bg-black/40 p-1 rounded-lg mb-4">
                    <button
                        onClick={() => setActiveTab('iframe')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'iframe' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Share2 className="w-4 h-4" /> Embed
                    </button>
                    <button
                        onClick={() => setActiveTab('react')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'react' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Code2 className="w-4 h-4" /> SDK
                    </button>
                </div>

                <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-auto font-mono text-sm relative group">
                    <SyntaxHighlighter code={activeTab === 'react' ? DEVELOPER_CODE : IFRAME_CODE} />
                </div>

                <div className="mt-4 text-xs text-gray-400 bg-white/5 p-3 rounded-lg leading-relaxed">
                    {activeTab === 'iframe'
                        ? "Copy this code to embed your player anywhere. Updating the color above automatically updates this snippet!"
                        : "Developers use the SDK to fetch raw data and map it to their specific component props (as shown in Step 2)."}
                </div>
            </div>
        </div>
    );
}

function SyntaxHighlighter({ code }: { code: string }) {
    return (
        <pre className="text-gray-300">
            {code.split('\n').map((line, i) => (
                <div key={i} className="leading-relaxed whitespace-pre-wrap break-all">
                    {line.includes('//') ? <span className="text-green-600">{line}</span> : line}
                </div>
            ))}
        </pre>
    );
}
