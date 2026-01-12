import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useParams } from 'react-router-dom';
import VoiceClipsPlayer from '../voice-demo/VoiceClipsPlayer';
import type { Track } from '../voice-demo/VoiceClipsPlayer';

export function AudioEmbed() {
    const { projectId } = useParams();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    // Read params from URL for configuration
    const query = new URLSearchParams(window.location.search);
    const [themeColor, setThemeColor] = useState(query.get('theme') || '#2563EB');

    // Configuration from URL
    const titleKey = query.get('title_field');
    const urlKey = query.get('url_field');
    const targetCollectionId = query.get('collection_id');
    const targetCollectionName = query.get('collection_name');

    useEffect(() => {
        async function loadProjectThemeAndData() {
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

            // 2. Get theme from "settings" collection if not explicitly in URL
            if (!query.get('theme')) {
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
                        let colorValue = null;
                        for (const row of settingsRows) {
                            const d = row.data;
                            const val = d.theme_color || d.color || d.brand_color || d.primary_color || d.hex || d.value;
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
            }

            // 3. Find target collection for tracks
            let collectionId = targetCollectionId;
            if (!collectionId) {
                let found;
                if (targetCollectionName) {
                    found = collections?.find(c => c.name.toLowerCase() === targetCollectionName.toLowerCase());
                } else {
                    found = collections?.find(c =>
                        ['songs', 'tracks', 'episodes', 'audio', 'voice_clips', 'clips', 'portfolio', 'music'].includes(c.name.toLowerCase())
                    );
                }
                collectionId = found?.id || null;
            }

            if (!collectionId) {
                setLoading(false);
                return;
            }

            const { data: rows } = await supabase
                .schema('built_flexdata')
                .from('rows')
                .select('id, data')
                .eq('collection_id', collectionId)
                .order('sort_order', { ascending: true });

            // Map Flexible Data
            const formattedTracks: Track[] = rows?.map(r => ({
                id: r.id,
                name: (titleKey ? r.data[titleKey] : null) || r.data.title || r.data.name || r.data.track_title || r.data.label || r.data.track || r.data.song_name || 'Untitled',
                url: (urlKey ? r.data[urlKey] : null) || r.data.url || r.data.audio_url || r.data.file || r.data.audio_file || r.data.audio || r.data.song || r.data.mp3 || r.data.link || r.data.source || '',
                clips: Array.isArray(r.data.clips) ? r.data.clips : [
                    { name: 'Full Audio', start: 0, end: 999999 }
                ]
            })).filter(t => t.url) || [];

            setTracks(formattedTracks);
            setLoading(false);
        }

        loadProjectThemeAndData();
    }, [projectId, titleKey, urlKey, targetCollectionId, targetCollectionName]);

    if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (tracks.length === 0) return <div className="h-screen flex items-center justify-center text-gray-400">No tracks found via API</div>;

    return (
        <div className="h-screen w-full bg-white flex flex-col items-center justify-center p-4">
            {/* Render the specialized Player */}
            <VoiceClipsPlayer tracks={tracks} themeColor={themeColor} />
        </div>
    );
}
