import { useCallback, useState } from 'react';
import { sounds, isMuted, toggleMute } from '../lib/audio';

export function useSound() {
  const [muted, setMuted] = useState(isMuted());

  const play = useCallback((name) => {
    sounds[name]?.();
    if (name === 'success' && navigator.vibrate) navigator.vibrate(50);
    if (name === 'error' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
    if (name === 'kaching' && navigator.vibrate) navigator.vibrate([20, 30, 20, 30, 20]);
  }, []);

  const toggle = useCallback(() => {
    const newMuted = toggleMute();
    setMuted(newMuted);
    if (!newMuted) sounds.click();
  }, []);

  return { play, muted, toggle };
}
