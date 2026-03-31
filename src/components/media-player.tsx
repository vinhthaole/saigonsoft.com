'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { PlayCircle } from 'lucide-react';
import type { APITypes } from 'plyr-react';
import dynamic from 'next/dynamic';
import 'plyr-react/plyr.css';

const Plyr = dynamic(() => import('plyr-react').then((mod) => mod.Plyr as any), { 
    ssr: false,
    loading: () => <div className="w-full aspect-video bg-slate-900 rounded-xl animate-pulse"></div>
}) as any;

interface MediaPlayerProps {
  url: string;
  className?: string;
  autoPlay?: boolean;
  isActive?: boolean;
}

export function MediaPlayer({ url, className = '', autoPlay = false, isActive = true }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMounted, setIsMounted] = useState(false);
  const plyrRef = useRef<APITypes>(null);
  const nativeMediaRef = useRef<HTMLMediaElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // YouTube extraction logic
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const plyrSource = useMemo(() => {
    const vidId = getYoutubeId(url);
    if (!vidId) return null;
    return {
        type: 'video' as const,
        poster: `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`,
        sources: [
            {
                src: vidId,
                provider: 'youtube' as const,
            },
        ],
    };
  }, [url]);

  const plyrOptions = useMemo(() => ({
      autoplay: autoPlay,
      muted: autoPlay, // Autoplay usually requires muted to work securely
      youtube: {
         noCookie: true,
         rel: 0,
         showinfo: 0,
         iv_load_policy: 3,
         modestbranding: 1,
         controls: 0, // Let Plyr handle all controls!
         disablekb: 1,
         mute: autoPlay ? 1 : 0,
      }
  }), [autoPlay]);

  useEffect(() => {
      // Pause playback when component becomes inactive (e.g. tab switch)
      if (isActive === false) {
          if (plyrRef.current?.plyr) {
              plyrRef.current.plyr.pause();
          }
          if (nativeMediaRef.current) {
              nativeMediaRef.current.pause();
          }
      }
  }, [isActive]);

  if (!url || !isMounted) return null;

  // 1. Check if it's an MP3 file
  if (url.toLowerCase().endsWith('.mp3') || url.includes('.mp3?')) {
    return (
      <div className={`w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border shadow-sm flex items-center gap-4 ${className}`}>
        <div className="bg-primary/10 p-3 rounded-full shrink-0">
            <PlayCircle className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
            <p className="text-sm font-semibold mb-2">Bản Audio Hướng Dẫn</p>
            <audio ref={nativeMediaRef as any} controls autoPlay={autoPlay} muted={autoPlay} className="w-full h-10 outline-none" controlsList="nodownload">
                <source src={url} type="audio/mpeg" />
                Trình duyệt của bạn không hỗ trợ thẻ audio.
            </audio>
        </div>
      </div>
    );
  }

  // 2. Check if it's a native Video file
  if (url.toLowerCase().match(/\.(mp4|mov|webm)(\?.*)?$/)) {
    return (
      <div className={`w-full overflow-hidden rounded-xl border shadow-sm bg-black group relative ${className}`}>
         {/* Native HTML5 Video hides storage origin perfectly */}
        <video 
            ref={nativeMediaRef as any}
            controls 
            autoPlay={autoPlay}
            muted={autoPlay}
            className="w-full h-auto max-h-[500px] outline-none" 
            controlsList="nodownload" 
            playsInline
            preload="metadata"
        >
          <source src={url} />
          Trình duyệt của bạn không hỗ trợ thẻ video.
        </video>
      </div>
    );
  }



  const videoId = getYoutubeId(url);

  if (videoId && plyrSource) {
    // We use Plyr to completely hide YouTube branding and make it look native like Vimeo.
    return (
      <div className={`plyr-youtube-wrapper overflow-hidden rounded-xl border shadow-sm ${className}`}>
        {/* We add global css override to completely hide the youtube watermark if it ever peeks through */}
        <style dangerouslySetInnerHTML={{__html: `
           .plyr-youtube-wrapper {
              --plyr-color-main: hsl(var(--primary));
           }
           /* Chặn hoàn toàn tương tác chuột vào bên trong Iframe gốc của Youtube để ngăn chặn các UI nội bộ (tiêu đề, avatar) nổi lên khi hover chuột */
           .plyr-youtube-wrapper iframe {
               pointer-events: none !important;
           }
           /* Che mờ mác youtube nếu có lọt ra ngoài */
           .plyr--youtube .plyr__video-wrapper::after {
               content: "";
               position: absolute;
               bottom: 0;
               right: 0;
               width: 100px;
               height: 60px;
               z-index: 50;
               background: transparent;
               pointer-events: none;
           }
        `}} />
        <Plyr
            ref={plyrRef as any}
            source={plyrSource}
            options={plyrOptions}
        />
      </div>
    );
  }

  // 4. Default fallback: It's an unrecognized URL or simple embed link. We render it as a secure Iframe
  return (
     <div className={`w-full aspect-video rounded-xl overflow-hidden shadow-sm border ${className}`}>
        <iframe 
            src={url}
            className="w-full h-full border-0 outline-none"
            allowFullScreen
            loading="lazy"
        />
     </div>
  );
}
