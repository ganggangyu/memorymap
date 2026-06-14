import { useState, useEffect, useRef } from 'react';

export const useAudio = (defaultUrl: string) => {
  const [bgmUrl, setBgmUrl] = useState(defaultUrl);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isBgmPlaying) {
        audioRef.current.play().catch(e => console.log('BGM Play failed', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isBgmPlaying, bgmUrl]);

  const toggleBgm = () => setIsBgmPlaying(prev => !prev);

  return { bgmUrl, setBgmUrl, isBgmPlaying, setIsBgmPlaying, toggleBgm, audioRef };
};
