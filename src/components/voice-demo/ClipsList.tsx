import { Play, Pause } from 'lucide-react';

interface Clip {
    name: string;
    start: number;
    end: number;
}

interface ClipsListProps {
    selectedTrack: any;
    currentClipIndex: number | null;
    isPlaying: boolean;
    themeColor: string;
    audioRef: React.RefObject<HTMLAudioElement>;
    currentTime: number;
    setIsPlaying: (playing: boolean) => void;
    setCurrentClipIndex: (index: number | null) => void;
}

export default function ClipsList({ selectedTrack, currentClipIndex, isPlaying, themeColor, audioRef, currentTime, setIsPlaying, setCurrentClipIndex }: ClipsListProps) {
    const getClipProgress = (clip: Clip) => {
        if (currentClipIndex === null || !selectedTrack) return 0;

        // If clip.end is very large (like 999999), use actual audio duration
        const audio = audioRef.current;
        const effectiveEnd = clip.end > 10000 && audio?.duration
            ? audio.duration
            : clip.end;

        const clipDuration = effectiveEnd - clip.start;
        const elapsed = currentTime - clip.start;
        return Math.max(0, Math.min(100, (elapsed / clipDuration) * 100));
    };

    return (
        <div className="space-y-1 h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
            <style>{`
                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background-color: rgb(203 213 225);
                    border-radius: 3px;
                }
                .scrollbar-thin:hover::-webkit-scrollbar-thumb {
                    background-color: rgb(148 163 184);
                }
            `}</style>
            {selectedTrack.clips.map((clip: Clip, index: number) => {
                const isCurrentClip = index === currentClipIndex;
                const clipProgress = isCurrentClip ? getClipProgress(clip) : 0;

                return (
                    <button
                        key={index}
                        onClick={(e) => {
                            const audio = audioRef.current;
                            if (!audio || !selectedTrack) return;

                            // If this is not the current clip, just start playing it from the beginning
                            if (currentClipIndex !== index) {
                                setCurrentClipIndex(index);
                                audio.currentTime = clip.start;
                                audio.play();
                                setIsPlaying(true);
                            } else {
                                // If it's the current clip and playing, allow seeking
                                if (isPlaying) {
                                    // Calculate click position as percentage
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const percentage = clickX / rect.width;

                                    // Calculate time within the clip
                                    // Use effective end for clips with huge end times
                                    const effectiveEnd = clip.end > 10000 && audio.duration
                                        ? audio.duration
                                        : clip.end;
                                    const clipDuration = effectiveEnd - clip.start;
                                    const seekTime = clip.start + (clipDuration * percentage);

                                    // Seek to that position
                                    audio.currentTime = Math.max(clip.start, Math.min(seekTime, effectiveEnd));
                                    audio.play();
                                } else {
                                    // If it's paused, just resume from current position
                                    audio.play();
                                    setIsPlaying(true);
                                }
                            }
                        }}
                        className="voiceclips-clip-button w-full relative overflow-hidden rounded-lg border border-slate-200 hover:border-slate-300 transition-all group cursor-pointer focus:outline-none focus-visible:outline-none active:outline-none"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {/* Full-height progress background */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                        >
                            <div
                                className="h-full"
                                style={{
                                    width: `${clipProgress}%`,
                                    backgroundColor: `${themeColor}15`
                                }}
                            />
                        </div>

                        {/* Content */}
                        <div className="relative flex items-center gap-3 px-3 py-2.5">
                            {/* Discreet play button */}
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${isCurrentClip && isPlaying
                                    ? 'text-[var(--theme-color)]'
                                    : 'text-slate-400 group-hover:text-slate-600'
                                    }`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent button's seek behavior

                                    const audio = audioRef.current;
                                    if (!audio || !selectedTrack) return;

                                    if (isCurrentClip && isPlaying) {
                                        // Pause if this clip is currently playing
                                        audio.pause();
                                        setIsPlaying(false);
                                    } else {
                                        // Play this clip
                                        if (currentClipIndex !== index) {
                                            setCurrentClipIndex(index);
                                            audio.currentTime = clip.start;
                                        }
                                        audio.play();
                                        setIsPlaying(true);
                                    }
                                }}
                                style={{ color: isCurrentClip && isPlaying ? themeColor : undefined }}
                            >
                                {isCurrentClip && isPlaying ? (
                                    <Pause size={14} fill="currentColor" />
                                ) : (
                                    <Play size={14} fill="currentColor" className="ml-0.5" />
                                )}
                            </div>

                            {/* Clip name - smaller font */}
                            <span className={`text-sm font-medium truncate ${isCurrentClip && isPlaying ? 'text-[var(--theme-color)]' : 'text-slate-700'
                                }`}
                                style={{ color: isCurrentClip && isPlaying ? themeColor : undefined }}
                            >
                                {clip.name}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
