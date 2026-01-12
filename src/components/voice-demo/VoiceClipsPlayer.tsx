import { useState, useRef, useEffect } from 'react';
import { Play, Pause, ChevronDown } from 'lucide-react';
import ClipsList from './ClipsList';
import ShareModal from './ShareModal';

export interface Clip {
    name: string;
    start: number;
    end: number;
}

export interface Track {
    id: string;
    name: string;
    url: string;
    clips: Clip[];
}

interface VoiceClipsPlayerProps {
    tracks: Track[];
    themeColor?: string;
}

export default function VoiceClipsPlayer({ tracks, themeColor = '#6366f1' }: VoiceClipsPlayerProps) {
    // Helper functions for URL-friendly track names
    const trackNameToSlug = (name: string) => {
        return name.toLowerCase().replace(/\s+/g, '-');
    };

    const slugToTrackName = (slug: string) => {
        return slug.replace(/-/g, ' ');
    };

    // Get initial track from URL parameter or default to first track
    const getInitialTrack = () => {
        const params = new URLSearchParams(window.location.search);
        const trackParam = params.get('track');
        if (trackParam) {
            const normalizedParam = slugToTrackName(trackParam);
            const track = tracks.find(t => t.name.toLowerCase() === normalizedParam.toLowerCase());
            if (track) return track;
        }
        return tracks[0] || null;
    };

    const [selectedTrack, setSelectedTrack] = useState<Track | null>(getInitialTrack());
    const [currentClipIndex, setCurrentClipIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Update URL when track changes
    useEffect(() => {
        if (selectedTrack) {
            const params = new URLSearchParams(window.location.search);
            params.set('track', trackNameToSlug(selectedTrack.name));
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({}, '', newUrl);
        }
    }, [selectedTrack]);

    // Load track when selected and auto-play
    useEffect(() => {
        if (selectedTrack && audioRef.current && selectedTrack.clips.length > 0) {
            const audio = audioRef.current;
            console.log('Loading track:', selectedTrack.name, 'URL:', selectedTrack.url);
            audio.src = selectedTrack.url;

            // Auto-play first clip after loading
            audio.onloadedmetadata = () => {
                const firstClip = selectedTrack.clips[0];
                console.log('Audio loaded, starting clip:', firstClip.name, 'at', firstClip.start);
                setCurrentClipIndex(0);
                audio.currentTime = firstClip.start;
                // audio.play().then(() => {
                //     console.log('Playback started');
                //     setIsPlaying(true);
                // }).catch(err => {
                //     console.log('Auto-play prevented:', err);
                // });
            };
        }
    }, [selectedTrack]);

    // Spacebar to play/pause
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only handle spacebar
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault(); // Prevent page scroll

                const audio = audioRef.current;
                if (!audio || !selectedTrack || selectedTrack.clips.length === 0) return;

                if (isPlaying) {
                    audio.pause();
                    setIsPlaying(false);
                } else {
                    // If no clip is selected, start from the first one
                    if (currentClipIndex === null) {
                        setCurrentClipIndex(0);
                        audio.currentTime = selectedTrack.clips[0].start;
                    }
                    audio.play();
                    setIsPlaying(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying, currentClipIndex, selectedTrack]);

    const playClip = (index: number) => {
        const audio = audioRef.current;
        if (!audio || !selectedTrack) return;

        const clip = selectedTrack.clips[index];

        // If clicking the currently playing clip, pause it
        if (currentClipIndex === index && isPlaying) {
            audio.pause();
            setIsPlaying(false);
            return;
        }

        // Play the clip
        setCurrentClipIndex(index);
        audio.currentTime = clip.start;
        audio.volume = 1; // Ensure volume is up

        console.log('Attempting to play clip:', clip.name, 'Time:', audio.currentTime, 'Volume:', audio.volume, 'Paused:', audio.paused);

        // Use a promise to ensure smooth transition
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Playback started successfully');
                setIsPlaying(true);
            }).catch(error => {
                console.error('Playback error:', error);
            });
        }
    };

    // Smooth progress updates using requestAnimationFrame
    useEffect(() => {
        let animationFrameId: number;

        const updateProgress = () => {
            const audio = audioRef.current;
            if (audio && currentClipIndex !== null && selectedTrack && isPlaying) {
                const clip = selectedTrack.clips[currentClipIndex];
                setCurrentTime(audio.currentTime);

                // Auto-advance to next clip when current one ends
                // For clips with huge end times (999999), check if audio actually ended
                const effectiveEnd = clip.end > 10000 && audio.duration
                    ? audio.duration
                    : clip.end;

                if (audio.currentTime >= effectiveEnd - 0.2 || audio.ended) {
                    if (currentClipIndex < selectedTrack.clips.length - 1) {
                        const nextClip = selectedTrack.clips[currentClipIndex + 1];
                        setCurrentClipIndex(currentClipIndex + 1);
                        audio.currentTime = nextClip.start;
                    } else {
                        audio.pause();
                        setIsPlaying(false);
                        setCurrentClipIndex(null);
                        return;
                    }
                }
            }

            animationFrameId = requestAnimationFrame(updateProgress);
        };

        if (isPlaying) {
            animationFrameId = requestAnimationFrame(updateProgress);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPlaying, currentClipIndex, selectedTrack]);

    // Handle null tracks
    if (!tracks || tracks.length === 0) {
        return (
            <div className="p-4 text-center border border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                No tracks loaded
            </div>
        );
    }

    // Handle if selectedTrack somehow became null but tracks exist
    const activeTrack = selectedTrack || tracks[0];

    return (
        <div
            className="relative w-full max-w-[380px] mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200"
            style={{ '--theme-color': themeColor } as React.CSSProperties}
        >
            <style>{`
                .voiceclips-clip-button:active,
                .voiceclips-clip-button:focus,
                .voiceclips-clip-button:focus-visible {
                    outline: none !important;
                    border-color: rgb(226 232 240) !important;
                }
            `}</style>
            <audio ref={audioRef} />

            <div className="p-5 space-y-4">
                {/* Track Selector Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                        <span className="font-semibold text-slate-900 truncate pr-2">
                            {activeTrack?.name || 'Select a track'}
                        </span>
                        <ChevronDown size={20} className={`text-slate-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                            {tracks.map((track) => (
                                <button
                                    key={track.id}
                                    onClick={() => {
                                        setSelectedTrack(track);
                                        setDropdownOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${activeTrack?.id === track.id ? 'bg-[var(--theme-color)]/10 text-[var(--theme-color)] font-semibold' : 'text-slate-700'
                                        }`}
                                >
                                    {track.name}
                                    <span className="text-xs text-slate-400 ml-2">
                                        ({track.clips.length} clips)
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Playback Controls */}
                {activeTrack && activeTrack.clips.length > 0 && (
                    <div className="flex items-center justify-start gap-3">
                        <button
                            onClick={() => {
                                if (currentClipIndex !== null && currentClipIndex > 0) {
                                    playClip(currentClipIndex - 1);
                                }
                            }}
                            disabled={currentClipIndex === null || currentClipIndex === 0}
                            className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => {
                                if (currentClipIndex !== null) {
                                    playClip(currentClipIndex);
                                } else if (activeTrack.clips.length > 0) {
                                    playClip(0);
                                }
                            }}
                            className="w-10 h-10 rounded-full bg-[var(--theme-color)] text-white flex items-center justify-center hover:opacity-90 transition-all shadow-md"
                        >
                            {isPlaying ? (
                                <Pause size={18} fill="currentColor" />
                            ) : (
                                <Play size={18} fill="currentColor" className="ml-0.5" />
                            )}
                        </button>

                        <button
                            onClick={() => {
                                if (currentClipIndex !== null && activeTrack && currentClipIndex < activeTrack.clips.length - 1) {
                                    playClip(currentClipIndex + 1);
                                }
                            }}
                            disabled={currentClipIndex === null || (activeTrack && currentClipIndex === activeTrack.clips.length - 1)}
                            className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                            </svg>
                        </button>
                    </div>
                )}


                {/* Clips List with Full-Height Progress Bars */}
                {activeTrack && activeTrack.clips.length > 0 && (
                    <ClipsList
                        selectedTrack={activeTrack}
                        currentClipIndex={currentClipIndex}
                        isPlaying={isPlaying}
                        themeColor={themeColor}
                        audioRef={audioRef as React.RefObject<HTMLAudioElement>}
                        currentTime={currentTime}
                        setIsPlaying={setIsPlaying}
                        setCurrentClipIndex={setCurrentClipIndex}
                    />
                )}

                {/* Footer and Notifications Area */}
                <div className="relative pt-4 border-t border-slate-100">

                    <div className="flex items-center justify-between">
                        <a
                            href="https://built.at"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold tracking-widest uppercase text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            Built.at
                        </a>

                        {activeTrack && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="text-slate-300 hover:text-slate-500 transition-colors p-1"
                                title="Share this track"
                            >                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3" />
                                    <circle cx="6" cy="12" r="3" />
                                    <circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div >

            {/* Share Modal */}
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                themeColor={themeColor}
            />
        </div >
    );
}
