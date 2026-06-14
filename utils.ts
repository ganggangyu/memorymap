
import { MemoryEvent } from './types';

// Standardized Date Formatter (Locale Independent)
// Returns format: "YYYY-MM-DD" (e.g., "2024-12-23")
export const formatDateStandard = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// For display purposes, convert YYYY-MM-DD to a more readable string
export const formatDisplayDate = (dateStr: string): string => {
    if (dateStr === 'Future') return '未来之约';
    const d = new Date(dateStr.replace(/-/g, '/')); // Use / for better Safari support
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const parseDateRobustly = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date('9999-12-31');
    const cleanedDateStr = dateStr.trim();
    if (cleanedDateStr.toLowerCase() === 'future') return new Date('9999-12-31');
    
    // Using / instead of - ensures better Safari compatibility for Date parsing
    const d = new Date(cleanedDateStr.replace(/-/g, '/'));
    return isNaN(d.getTime()) ? new Date('9999-12-31') : d;
};

/**
 * Sorts events ascending by date (Oldest -> Newest).
 * Stable sort: Uses ID as a tie-breaker when dates are identical.
 */
export const sortEventsAscending = (a: MemoryEvent, b: MemoryEvent) => {
  const dateA = parseDateRobustly(a.date).getTime();
  const dateB = parseDateRobustly(b.date).getTime();

  if (dateA !== dateB) {
    return dateA - dateB;
  }
  // 同一天：按时分排序
  const timeA = a.time || '23:59';
  const timeB = b.time || '99:99';
  if (timeA !== timeB) return timeA.localeCompare(timeB);
  return String(a.id).localeCompare(String(b.id));
};

/**
 * Sorts events descending by date (Newest -> Oldest).
 * Stable sort: Uses ID as a tie-breaker when dates are identical.
 */
export const sortEventsDescending = (a: MemoryEvent, b: MemoryEvent) => {
  const dateA = parseDateRobustly(a.date).getTime();
  const dateB = parseDateRobustly(b.date).getTime();

  if (dateA !== dateB) {
    return dateB - dateA;
  }
  // 同一天：时间倒序
  const timeA = a.time || '00:00';
  const timeB = b.time || '00:00';
  if (timeA !== timeB) return timeB.localeCompare(timeA);
  return String(b.id).localeCompare(String(a.id));
};

export const isValidCoords = (coords: any): coords is [number, number] => {
    return Array.isArray(coords) && coords.length === 2 && 
           typeof coords[0] === 'number' && Number.isFinite(coords[0]) &&
           typeof coords[1] === 'number' && Number.isFinite(coords[1]);
};

export const formatDMS = (lat: number, lng: number) => {
    const toDMS = (deg: number, isLat: boolean) => {
        const absolute = Math.abs(deg);
        const degrees = Math.floor(absolute);
        const minutesNotTruncated = (absolute - degrees) * 60;
        const minutes = Math.floor(minutesNotTruncated);
        const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
        const card = isLat ? (deg >= 0 ? "N" : "S") : (deg >= 0 ? "E" : "W");
        return `${degrees}°${minutes}'${seconds}"${card}`;
    };
    return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
};

// --- Distance Calculation (Haversine Formula) ---
const toRad = (value: number) => (value * Math.PI) / 180;

export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const calculateTotalJourney = (events: MemoryEvent[]) => {
    const sorted = [...events].sort(sortEventsAscending).filter(e => e.location && isValidCoords(e.location.coords));
    let totalKm = 0;
    
    for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i].location.coords;
        const next = sorted[i+1].location.coords;
        totalKm += calculateDistanceKm(curr[0], curr[1], next[0], next[1]);
    }
    return Math.round(totalKm);
};

export const calculateSlope = (distKm: number, ascentM: number): number => {
    if (distKm === 0) return 0;
    const distM = distKm * 1000;
    return (ascentM / distM) * 100;
};

export const getPseudoElevation = (lat: number, lon: number): number => {
    if (typeof lat !== 'number' || typeof lon !== 'number') return 0;
    const val = Math.sin(lat * 10) * Math.cos(lon * 10) + Math.sin(lat * 20 + lon * 20) * 0.5;
    const norm = (val + 1.5) / 3;
    return Math.floor(norm * 2000); 
};

// ... keep existing calculateJourneyStats if they were there,
// re-implementing calculateJourneyStats here just in case since it uses distance
const deg2rad = (deg: number) => deg * (Math.PI / 180);

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  return calculateDistanceKm(lat1, lon1, lat2, lon2);
};

export const calculateJourneyStats = (events: MemoryEvent[]) => {
    const sorted = [...events].sort(sortEventsAscending).filter(e => e.location && isValidCoords(e.location.coords));
    let totalDistance = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
        const c1 = sorted[i].location.coords;
        const c2 = sorted[i+1].location.coords;
        totalDistance += calculateDistanceKm(c1[0], c1[1], c2[0], c2[1]);
    }

    const locations = new Set(events.map(e => e.location.name.split(',')[0].trim()));

    return {
        totalDistance: Math.round(totalDistance),
        locationCount: locations.size,
        totalMemories: events.length
    };
};

let _audioCtx: AudioContext | null = null;
const getAudioContext = (): AudioContext => {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _audioCtx;
};

export const playGameSound = (type: 'click' | 'flip' | 'match' | 'victory' | 'bell' | 'drop' | 'undo') => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    try {
        if (type === 'click' || type === 'undo') {
            osc.frequency.setValueAtTime(type === 'undo' ? 400 : 800, now);
            osc.frequency.exponentialRampToValueAtTime(type === 'undo' ? 200 : 400, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'drop') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'flip') {
            const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.05, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            noise.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);
        } else if (type === 'match') {
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'victory') {
            const notes = [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.2 }, { f: 783.99, t: 0.4 }, { f: 1046.50, t: 0.6 }];
            notes.forEach(({f, t}) => {
                const vOsc = ctx.createOscillator();
                const vGain = ctx.createGain();
                vOsc.connect(vGain);
                vGain.connect(ctx.destination);
                vOsc.type = 'triangle';
                vOsc.frequency.value = f;
                vGain.gain.setValueAtTime(0, now + t);
                vGain.gain.linearRampToValueAtTime(0.2, now + t + 0.05);
                vGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.5);
                vOsc.start(now + t);
                vOsc.stop(now + t + 0.5);
            });
        } else if (type === 'bell') {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); 
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1046.50, now); 
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
            
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(0.1, now + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            osc.start(now);
            osc.stop(now + 2.0);
            osc2.start(now);
            osc2.stop(now + 2.0);
        }
    } catch(e) {}
};
