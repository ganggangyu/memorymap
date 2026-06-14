
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MemoryEvent } from '../types';
import {
    PlusIcon, MinusIcon, CrosshairIcon, SearchIcon, MapPinIcon, CheckIcon, XIcon,
    PlaneIcon, CoffeeIcon, UtensilsIcon, GiftIcon, GamepadIcon, TreeIcon, SparklesIcon,
    EditIcon, PrinterIcon, PlayIcon, PauseIcon, ChevronRightIcon
} from './icons';
import { sortEventsAscending, sortEventsDescending, isValidCoords, calculateTotalJourney } from '../utils';
import { getTagConfig, getTagIconSvgName } from '../utils/tagConfig';
import GISLayerControl from './GISLayerControl';

interface MapViewProps {
  events: MemoryEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  isAddingLocation: boolean;
  onMapLocationSelect: (coords: [number, number]) => void;
  onCancelAdd?: () => void;
  flyToCoords: [number, number] | null;
  onMarkerMove: (id: string | string[], coords: [number, number]) => void;
  onAddAtLocation?: (coords: [number, number], locationName: string) => void;
  activeJourneySegment?: [number, number][] | null;
}

const getSvgString = (tags: string[], isSelected: boolean) => {
    const iconName = getTagIconSvgName(tags);
    const colorClass = isSelected ? 'text-white' : 'text-seal-500';
    const commonProps = `class="w-6 h-6 ${colorClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

    switch (iconName) {
        case 'travel': return `<svg ${commonProps}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
        case 'daily': return `<svg ${commonProps}><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
        case 'food': return `<svg ${commonProps}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>`;
        case 'anniversary': return `<svg ${commonProps}><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>`;
        case 'entertainment': return `<svg ${commonProps}><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>`;
        case 'nature': return `<svg ${commonProps}><path d="M12 19V5" /><path d="M5 19h14" /><path d="M5 12l7-7 7 7" /><path d="M6 16l6-6 6 6" /></svg>`;
        case 'dream': return `<svg ${commonProps} fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>`;
        case 'milestone': return `<svg ${commonProps} fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        default: return `<svg ${commonProps}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    }
};

const getTypeIconFromTags = (tags: string[]) => {
    const iconName = getTagIconSvgName(tags);
    switch (iconName) {
        case 'travel': return <PlaneIcon className="w-5 h-5 text-blue-400" />;
        case 'daily': return <CoffeeIcon className="w-5 h-5 text-gray-400" />;
        case 'food': return <UtensilsIcon className="w-5 h-5 text-orange-400" />;
        case 'anniversary': return <GiftIcon className="w-5 h-5 text-ink-400" />;
        case 'entertainment': return <GamepadIcon className="w-5 h-5 text-sage-400" />;
        case 'nature': return <TreeIcon className="w-5 h-5 text-green-400" />;
        case 'dream': return <SparklesIcon className="w-5 h-5 text-yellow-400" />;
        case 'milestone': return <SparklesIcon className="w-5 h-5 text-ink-300" />;
        default: return <SparklesIcon className="w-5 h-5 text-ink-300" />;
    }
};

const getGroupedIcon = (eventGroup: MemoryEvent[], isSelected: boolean) => {
  if (!eventGroup || eventGroup.length === 0) return new L.DivIcon({ html: '' });
  const representativeEvent = eventGroup[0];
  const count = eventGroup.length;
  const isCluster = count > 1;
  const tags = representativeEvent.tags || [];
  const isMilestone = tags.includes('里程碑');

  const slideshowImages = isCluster
      ? eventGroup.flatMap(e => e.imageUrls || []).slice(0, 5)
      : (representativeEvent.imageUrls || []).slice(0, 1);

  const hasImage = slideshowImages.length > 0;

  let innerHtml;

  if (isCluster) {
      let contentHtml;
      if (hasImage) {
          const totalImages = slideshowImages.length;
          const duration = totalImages * 2;
          const slides = slideshowImages.map((url, i) => `
            <img src="${url}"
                 class="absolute inset-0 w-full h-full object-cover heart-slide"
                 style="animation-delay: ${i * 2}s; animation-duration: ${duration}s;"
            />
          `).join('');
          contentHtml = `<div class="w-full h-full relative bg-gray-200 overflow-hidden">${slides}</div>`;
      } else {
          contentHtml = `<div class="w-full h-full bg-gradient-to-br from-seal-400 to-seal-500 flex items-center justify-center text-white">${getSvgString(tags, true)}</div>`;
      }

      innerHtml = `
        <div class="relative w-14 h-14 transition-transform hover:scale-110 ${isSelected ? 'scale-125 z-50' : 'z-10'}">
            <div class="absolute inset-0 shadow-xl drop-shadow-lg heart-shape-container ${isSelected ? 'ring-4 ring-seal-400' : ''}">
                ${contentHtml}
            </div>
            <div class="absolute -top-1 -right-1 bg-paper-surface text-seal-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-seal-100 shadow-sm z-20">
                ${count}
            </div>
            ${isMilestone ? '<div class="absolute -bottom-1 -left-1 text-yellow-400 drop-shadow-md z-20"><svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>' : ''}
        </div>
      `;

      return new L.DivIcon({
        html: innerHtml,
        className: 'bg-transparent',
        iconSize: [56, 56],
        iconAnchor: [28, 50],
      });
  }

  let containerClasses, tipColorClass;
  const imageUrl = hasImage ? slideshowImages[0] : null;
  // 根据标签决定显示样式
  const displayTags = tags;
  const isDream = displayTags.includes('愿望') && !hasImage;

  if (hasImage && imageUrl) {
      innerHtml = `<img src="${imageUrl}" class="w-full h-full rounded-full object-cover border-2 border-white" />`;
      containerClasses = `w-12 h-12 bg-paper-surface ${isSelected ? 'ring-4 ring-seal-400 ring-opacity-50 scale-125' : ''}`;
      tipColorClass = 'bg-paper-surface';
  } else {
      innerHtml = getSvgString(displayTags, isSelected);
      containerClasses = `w-10 h-10 ${isSelected ? 'bg-seal-500 scale-125' : 'bg-paper-surface'}`;
      tipColorClass = 'bg-inherit';
  }

  const milestoneBadge = isMilestone ? `<div class="absolute -bottom-1 -left-1 bg-paper-surface rounded-full p-0.5 shadow-md z-10"><svg class="w-3 h-3 text-seal-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>` : '';

  const html = `
    <div class="relative flex items-center justify-center rounded-full shadow-lg transition-transform duration-300 ${containerClasses} ${isDream ? 'border-2 border-dashed border-seal-400' : ''}">
      ${innerHtml}${milestoneBadge}
      <div class="absolute bottom-[-4px] w-3 h-3 transform rotate-45 ${tipColorClass}"></div>
    </div>
  `;

  return new L.DivIcon({
    html: html,
    className: isSelected ? 'pulse z-50' : '',
    iconSize: hasImage ? [48, 48] : [40, 40],
    iconAnchor: hasImage ? [24, 52] : [20, 44],
  });
};

const getPreviewIcon = () => {
    const html = `
      <div class="relative w-full h-full flex flex-col items-center justify-center filter drop-shadow-md">
        <svg class="w-full h-full text-seal-600" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      </div>
    `;
    return new L.DivIcon({
        html: html,
        className: 'preview-marker-bounce',
        iconSize: [40, 40],
        iconAnchor: [20, 38],
    });
};

const MapUpdater = ({ event, flyToCoords, activeJourneySegment }: { event: MemoryEvent | undefined, flyToCoords: [number, number] | null, activeJourneySegment?: [number, number][] | null }) => {
  const map = useMap();

  useEffect(() => {
      if (map) {
          const timer = setTimeout(() => {
              map.invalidateSize();
          }, 100);
          return () => clearTimeout(timer);
      }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    if (activeJourneySegment && activeJourneySegment.length === 2) {
        try {
            const bounds = L.latLngBounds(activeJourneySegment as any);
            map.fitBounds(bounds, { padding: [100, 100], maxZoom: 14, animate: true, duration: 2 });
        } catch (e) { console.warn("Journey fit failed", e); }
        return;
    }

    let targetCoords: [number, number] | null = null;
    let zoom = 15;

    if (flyToCoords && isValidCoords(flyToCoords)) {
        targetCoords = flyToCoords;
        zoom = 16;
    }
    else if (event && event.location && isValidCoords(event.location.coords)) {
        targetCoords = event.location.coords;
        zoom = 15;
    }

    if (targetCoords && isValidCoords(targetCoords)) {
        const size = map.getSize();
        if (size.x === 0 || size.y === 0) {
            map.invalidateSize();
            setTimeout(() => {
                if (map.getSize().x > 0) {
                    try { map.flyTo(targetCoords!, zoom, { animate: true, duration: 1.5 }); } catch(e) {}
                }
            }, 200);
            return;
        }
        try {
            map.flyTo(targetCoords, zoom, { animate: true, duration: 1.5 });
        } catch (error) {
            console.error("Leaflet flyTo error:", error);
        }
    }
  }, [flyToCoords, event, map, activeJourneySegment]);
  return null;
};

const MapClickHandler = ({ onMapClick }: { onMapClick: (coords: [number, number]) => void; }) => {
  useMapEvents({ click(e) { onMapClick([e.latlng.lat, e.latlng.lng]); } });
  return null;
};

const MapBackgroundClickHandler = ({ onDeselect }: { onDeselect: () => void }) => {
  useMapEvents({
    click() {
      onDeselect();
    },
  });
  return null;
};

const MapZoomListener = ({ onZoom }: { onZoom: (z: number) => void }) => {
    const map = useMapEvents({
        zoomend: () => onZoom(map.getZoom())
    });
    return null;
};

interface MapControlsProps {
    isEditMode: boolean;
    onToggleEdit: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({ isEditMode, onToggleEdit }) => {
  const map = useMap();
  const handleRecenter = () => {
    navigator.geolocation?.getCurrentPosition(
        (pos) => {
            const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            if (isValidCoords(coords) && map.getSize().x > 0) {
                try { map.flyTo(coords, 13); } catch (e) { console.error(e); }
            }
        },
        (err) => {
            if (err.code === 1) alert('定位被拒绝。请在手机设置中允许定位权限。');
            else alert('定位失败，请检查GPS是否开启。');
        }
    );
  };
  return (
    <div className="leaflet-bottom leaflet-right mb-40 md:mb-32 mr-2 z-[1000]">
      <div className="leaflet-control leaflet-bar bg-paper-surface shadow-lg rounded-md border-2 border-transparent overflow-hidden flex flex-col">
        <button
            onClick={onToggleEdit}
            className={`w-10 h-10 flex items-center justify-center border-b border-gray-200 transition-colors btn-bounce ${isEditMode ? 'bg-seal-100 text-seal-600 border-seal-100' : 'text-gray-700 hover:bg-paper-dark'}`}
            title={isEditMode ? "完成位置调整" : "调整图标位置"}
        >
            {isEditMode ? <CheckIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
        </button>

        <button onClick={() => map.zoomIn()} className="w-10 h-10 flex items-center justify-center border-b border-gray-200 text-gray-700 hover:bg-paper-dark btn-bounce"><PlusIcon className="w-5 h-5" /></button>
        <button onClick={() => map.zoomOut()} className="w-10 h-10 flex items-center justify-center border-b border-gray-200 text-gray-700 hover:bg-paper-dark btn-bounce"><MinusIcon className="w-5 h-5" /></button>
        <button onClick={handleRecenter} className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-50 btn-bounce" title="定位当前位置">
            <CrosshairIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const MapSearch = () => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const amapKey = localStorage.getItem('amap_key') || 'b4c1280f8624cc0bcc5cc30d987464c3';
      if (!amapKey) {
        alert('请先配置高德地图 Key：\n1. 打开 console.amap.com 注册\n2. 创建应用 → 添加 Key → 选"Web服务"\n3. 在菜单"数据管理"中填入 Key');
        setIsSearching(false);
        return;
      }
      const res = await fetch(
        `https://restapi.amap.com/v3/geocode/geo?key=${amapKey}&address=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.geocodes?.length > 0 && data.geocodes[0].location) {
        const [lon, lat] = data.geocodes[0].location.split(',').map(Number);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          map.flyTo([lat, lon], 14, { duration: 1.2 });
          setQuery(data.geocodes[0].formatted_address || q);
        } else {
          alert('坐标解析失败');
        }
      } else {
        alert(`未找到"${q}"，换一个更具体的名称试试`);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') alert('搜索超时（5秒），请检查网络后重试');
      else { console.error(e); alert('网络错误，请检查后重试'); }
    } finally { setIsSearching(false); }
  };
  return (
    <div
        ref={containerRef}
        className="leaflet-top leaflet-left mt-0 ml-14 z-[1000] safe-area-top"
        style={{ pointerEvents: 'auto' }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
    >
      <form onSubmit={handleSearch} className="flex items-center bg-paper-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden focus-within:ring-2 focus-within:ring-seal-400/50 transition-all hover:scale-[1.02]">
        <div className="pl-3 md:pl-4 text-gray-400"><SearchIcon className="w-4 h-4 md:w-5 md:h-5" /></div>
        <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索地点..."
            className="py-2 md:py-3 px-2 md:px-3 text-sm md:text-base outline-none w-28 xs:w-40 sm:w-60 md:w-80 text-gray-700 bg-transparent placeholder-gray-400 font-medium"
        />
        <button type="submit" disabled={isSearching} className="px-3 md:px-5 py-2 md:py-3 bg-paper-cream hover:bg-seal-50 border-l border-gray-100 text-seal-600 font-bold transition-colors text-sm md:text-base btn-bounce">
            {isSearching ? <div className="w-4 h-4 border-2 border-seal-500 border-t-transparent rounded-full animate-spin"></div> : <span>GO</span>}
        </button>
      </form>
    </div>
  );
};

const getClusterCenter = (events: MemoryEvent[]): [number, number] => {
    let sumLat = 0, sumLng = 0;
    events.forEach(e => {
        sumLat += e.location.coords[0];
        sumLng += e.location.coords[1];
    });
    return [sumLat / events.length, sumLng / events.length];
};

// --- Floating Memory Deck Component ---
const FloatingDeck = ({
    events,
    selectedEventId,
    onSelectEvent,
    onPlayJourney
}: {
    events: MemoryEvent[],
    selectedEventId: string | null,
    onSelectEvent: (id: string) => void,
    onPlayJourney: () => void
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const playbackRef = useRef<number | null>(null);

    const sortedEvents = useMemo(() => {
        return events
            .filter(e => !e.isSystemEvent && isValidCoords(e.location.coords))
            .sort(sortEventsAscending);
    }, [events]);

    useEffect(() => {
        if (selectedEventId && scrollRef.current) {
            const index = sortedEvents.findIndex(e => e.id === selectedEventId);
            if (index !== -1) {
                const card = scrollRef.current.children[index] as HTMLElement;
                if (card) {
                    scrollRef.current.scrollTo({
                        left: card.offsetLeft - scrollRef.current.clientWidth / 2 + card.clientWidth / 2,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [selectedEventId, sortedEvents]);

    const startJourney = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (playbackRef.current) clearTimeout(playbackRef.current);
            return;
        }

        setIsPlaying(true);
        onPlayJourney();

        let currentIndex = 0;

        const playNext = () => {
            if (currentIndex >= sortedEvents.length) {
                setIsPlaying(false);
                return;
            }
            onSelectEvent(sortedEvents[currentIndex].id);
            currentIndex++;
            playbackRef.current = window.setTimeout(playNext, 4000);
        };

        playNext();
    };

    useEffect(() => {
        return () => { if (playbackRef.current) clearTimeout(playbackRef.current); };
    }, []);

    if (sortedEvents.length === 0) return null;

    return (
        <div className="absolute bottom-20 left-0 right-0 z-[1500] pointer-events-none flex flex-col justify-end gap-2">
            <div className="flex justify-center pointer-events-auto mb-2">
                <button
                    onClick={startJourney}
                    className="flex items-center gap-2 px-5 py-2 bg-seal-500 hover:bg-seal-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 font-bold text-sm"
                >
                    {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                    {isPlaying ? '暂停旅程' : '重走旅程'}
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto px-8 py-4 snap-x snap-mandatory no-scrollbar pointer-events-auto items-end"
                style={{ scrollBehavior: 'smooth' }}
            >
                {sortedEvents.map(event => {
                    const isSelected = event.id === selectedEventId;
                    return (
                        <div
                            key={event.id}
                            onClick={() => onSelectEvent(event.id)}
                            className={`snap-center shrink-0 w-64 md:w-72 bg-paper-surface/90 backdrop-blur-md rounded-2xl shadow-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col
                                ${isSelected ? 'border-seal-400 scale-105 z-10 shadow-seal-100/50' : 'border-white/50 scale-95 opacity-90 hover:opacity-100 hover:scale-100'}
                            `}
                        >
                            <div className="h-32 w-full relative bg-paper-dark overflow-hidden">
                                {event.imageUrls && event.imageUrls.length > 0 ? (
                                    <img src={event.imageUrls[0]} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        {getTypeIconFromTags(event.tags || [])}
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                                    <span className="text-white text-xs font-bold uppercase tracking-wider">{event.date}</span>
                                </div>
                            </div>

                            <div className="p-3">
                                <h3 className="font-bold text-gray-800 text-sm truncate mb-1">{event.title}</h3>
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                    <MapPinIcon className="w-3 h-3 text-ink-400" />
                                    <span className="truncate">{event.location.name}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                                    {event.shortDescription}
                                </p>
                            </div>

                            {isSelected && (
                                <div className="absolute top-2 right-2 bg-seal-500 text-white p-1 rounded-full animate-bounce shadow-md">
                                    <ChevronRightIcon className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    );
                })}
                <div className="w-8 shrink-0"></div>
            </div>
        </div>
    );
};

const MapView: React.FC<MapViewProps> = ({
    events, selectedEventId, onSelectEvent, isAddingLocation, onMapLocationSelect, onCancelAdd,
    flyToCoords, onMarkerMove, onAddAtLocation, activeJourneySegment
}) => {
  const [activeBaseLayer, setActiveBaseLayer] = useState('amap');
  const [previewCoords, setPreviewCoords] = useState<[number, number] | null>(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [isEditMode, setIsEditMode] = useState(false);

  const [forcedCenter, setForcedCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
      setPreviewCoords(null);
  }, [isAddingLocation]);

  useEffect(() => {
      if (isAddingLocation) setIsEditMode(false);
  }, [isAddingLocation]);

  const tileLayerUrl = useMemo(() => {
    switch (activeBaseLayer) {
      case 'satellite': return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default: return 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
    }
  }, [activeBaseLayer]);
  const maxNativeZoom = 18;
  const tileAttribution = activeBaseLayer === 'amap' ? '&copy; AutoNavi' : (activeBaseLayer === 'satellite' ? 'Esri' : 'OSM');

  const groupedEvents = useMemo(() => {
    const validEvents = events.filter(e => !e.isSystemEvent && isValidCoords(e.location.coords));
    const threshold = 60 / Math.pow(2, currentZoom);
    const clusters: { coords: [number, number], events: MemoryEvent[], id: string }[] = [];
    const visited = new Set<string>();

    const sorted = [...validEvents].sort((a, b) => {
        const aMilestone = (a.tags || []).includes('里程碑');
        const bMilestone = (b.tags || []).includes('里程碑');
        if (aMilestone !== bMilestone) return aMilestone ? -1 : 1;
        return sortEventsDescending(a, b);
    });

    sorted.forEach(evt => {
        if (visited.has(evt.id)) return;

        const clusterEvents = [evt];
        visited.add(evt.id);
        const [lat1, lon1] = evt.location.coords;

        sorted.forEach(other => {
            if (visited.has(other.id)) return;
            const [lat2, lon2] = other.location.coords;
            const d = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
            if (d < threshold) {
                clusterEvents.push(other);
                visited.add(other.id);
            }
        });

        clusterEvents.sort(sortEventsDescending);

        clusters.push({
            coords: getClusterCenter(clusterEvents),
            events: clusterEvents,
            id: evt.id
        });
    });

    return clusters;
  }, [events, currentZoom]);

  const totalJourneyKm = useMemo(() => calculateTotalJourney(events), [events]);
  const stats = useMemo(() => {
      const cities = new Set(events.filter(e => !e.isSystemEvent).map(e => e.location.name.split(',')[0]));
      return { cities: cities.size, count: events.length };
  }, [events]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handlePreviewClick = (coords: [number, number]) => {
      setPreviewCoords(coords);
  };

  const confirmSelection = () => {
      if (previewCoords) {
          onMapLocationSelect(previewCoords);
      }
  };

  return (
    <>
        <style>{`
            @keyframes bounce-marker {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            .preview-marker-bounce > div {
                animation: bounce-marker 1.2s infinite ease-in-out;
            }
            .animate-draw-path {
                stroke-dasharray: 20;
                animation: dashDraw 1s linear infinite;
            }
            @keyframes dashDraw {
                to { stroke-dashoffset: -40; }
            }
            .heart-shape-container {
                width: 100%;
                height: 100%;
                clip-path: path('M28 53.4C27.5 53 12.6 39.1 4.7 32 1.3 29 0 25.5 0 21.3c0-7.2 5.8-13 13.1-13 4.1 0 8 2.2 10.3 5.7C25.7 10.5 29.6 8.3 33.7 8.3c7.3 0 13.1 5.8 13.1 13 0 4.2-1.3 7.7-4.7 10.7-7.9 7.1-22.8 21-23.3 21.4-.2.2-.5.2-.8 0z');
                transform: scale(1.2);
                transform-origin: center;
                background: white;
            }
            .heart-slide {
                opacity: 0;
                animation: fadeSlideshow infinite;
            }
            @keyframes fadeSlideshow {
                0% { opacity: 0; z-index: 1; }
                10% { opacity: 1; z-index: 2; }
                25% { opacity: 1; z-index: 2; }
                35% { opacity: 0; z-index: 1; }
                100% { opacity: 0; z-index: 1; }
            }
        `}</style>
        <MapContainer center={[35, 105]} zoom={4} scrollWheelZoom={true} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <MapZoomListener onZoom={setCurrentZoom} />
        <MapSearch />
        <GISLayerControl activeBaseLayer={activeBaseLayer} onChangeBaseLayer={setActiveBaseLayer} />
        <TileLayer
            attribution={tileAttribution}
            url={tileLayerUrl}
            maxNativeZoom={maxNativeZoom}
        />

        {isEditMode && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[2000] bg-seal-500/90 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-fadeIn flex items-center gap-2 backdrop-blur-sm pointer-events-none border border-seal-400">
                <EditIcon className="w-3 h-3" />
                <span>编辑模式：拖动图标调整位置</span>
            </div>
        )}

        {isAddingLocation && (
            <div className="leaflet-bottom leaflet-center mb-12 z-[2000] absolute left-1/2 -translate-x-1/2 pointer-events-none w-full flex justify-center">
                <div
                    className="bg-paper-surface/90 backdrop-blur-md text-gray-800 rounded-full shadow-2xl font-bold text-sm flex items-center gap-1 border border-gray-200 pointer-events-auto p-1.5 animate-fadeIn"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2 px-3 py-1.5">
                        <MapPinIcon className={`w-4 h-4 ${previewCoords ? 'text-seal-500' : 'text-gray-400'}`} />
                        <span>{previewCoords ? '再次点击地图移动位置' : '点击地图选择位置'}</span>
                    </div>

                    {onCancelAdd && (
                        <>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <button
                                onClick={onCancelAdd}
                                className="p-2 hover:bg-paper-dark rounded-full text-gray-500 transition-colors btn-bounce"
                                title="取消"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Preview Marker for Adding New Location */}
        {isAddingLocation && previewCoords && (
            <Marker
                position={previewCoords}
                icon={getPreviewIcon()}
                draggable={true}
                eventHandlers={{
                    dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        setPreviewCoords([lat, lng]);
                    },
                    add: (e) => e.target.openPopup()
                }}
                ref={(ref) => { if (ref) ref.openPopup(); }}
            >
                <Popup minWidth={120} closeButton={false} autoClose={false} closeOnClick={false} offset={[0, -30]}>
                     <div className="flex flex-col items-center gap-2 p-1 font-sans">
                         <p className="font-bold text-gray-700 text-xs m-0">确认以此处为地点吗?</p>
                         <button
                            onClick={(e) => { e.stopPropagation(); confirmSelection(); }}
                            className="bg-seal-500 hover:bg-seal-600 text-white px-4 py-1.5 rounded-full shadow-sm text-xs font-bold transition-colors w-full flex items-center justify-center gap-1 btn-bounce"
                         >
                            <CheckIcon className="w-3 h-3" />
                            确认添加
                         </button>
                     </div>
                </Popup>
            </Marker>
        )}

        {/* Memory Markers */}
        {groupedEvents.map((cluster) => {
            const representativeEvent = cluster.events[0];
            const isGroupSelected = cluster.events.some(e => e.id === selectedEventId);
            const distinctLocations = new Set(cluster.events.map(e => e.location.name));

            const popupTitle = distinctLocations.size > 1
                ? `${representativeEvent.location.name} +${distinctLocations.size - 1} 处`
                : representativeEvent.location.name;

            return (
                <Marker
                key={cluster.id}
                position={cluster.coords}
                icon={getGroupedIcon(cluster.events, isGroupSelected)}
                draggable={isEditMode && !isAddingLocation && distinctLocations.size === 1}
                eventHandlers={{
                    dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        if (isValidCoords([lat, lng])) {
                            onMarkerMove(cluster.events.map(evt => evt.id), [lat, lng]);
                        }
                    },
                    click: () => {
                        // Always show popup instead of directly opening detail
                        // Popup already has event list + "add new" button
                    }
                }}
                >
                {!isAddingLocation && (
                    <Popup minWidth={280} maxWidth={320} className="custom-popup">
                        <div className="p-1 min-w-[260px] font-sans">
                            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <MapPinIcon className="w-4 h-4 text-seal-500 shrink-0" />
                                    <h3 className="font-bold text-gray-800 text-sm truncate" title={popupTitle}>
                                        {popupTitle}
                                    </h3>
                                </div>
                                <span className="bg-seal-100 text-seal-600 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ml-2">
                                    {cluster.events.length} 个回忆
                                </span>
                            </div>

                            <div className="max-h-[240px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                {cluster.events.map((event, i) => {
                                    const tags = event.tags || [];
                                    const isMilestone = tags.includes('里程碑');
                                    return (
                                    <button
                                        key={event.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectEvent(event.id);
                                        }}
                                        className={`w-full text-left flex items-start gap-3 p-2 rounded-lg transition-all border ${event.id === selectedEventId ? 'bg-seal-50 border-seal-100 ring-1 ring-gold-300' : 'bg-paper-surface border-gray-100 hover:bg-paper-cream hover:border-seal-100'} btn-bounce`}
                                    >
                                        <div className="w-12 h-12 shrink-0 rounded-md bg-paper-cream overflow-hidden relative border border-gray-100 flex items-center justify-center">
                                            {event.imageUrls?.[0] ? (
                                                <img src={event.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="opacity-50">
                                                    {getTypeIconFromTags(tags)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-gray-800 text-xs truncate max-w-[120px]">{event.title}</span>
                                                {isMilestone && <span className="text-[10px] text-yellow-500">★</span>}
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-mono mb-1">{event.date}</p>
                                            <div className="flex gap-1 items-center flex-wrap">
                                                {tags.map(tag => {
                                                    const tc = getTagConfig(tag);
                                                    return (
                                                        <span key={tag} className="text-[8px] px-1 py-0.5 rounded text-white font-bold" style={{ backgroundColor: tc.color }}>
                                                            {tc.emoji} {tc.label}
                                                        </span>
                                                    );
                                                })}
                                                {distinctLocations.size > 1 && (
                                                    <span className="text-[9px] text-gray-400 truncate max-w-[80px]">
                                                        @{event.location.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                    );
                                })}
                            </div>

                            {onAddAtLocation && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddAtLocation(cluster.coords, representativeEvent.location.name); }}
                                    className="w-full mt-3 py-2 bg-gradient-to-r from-seal-500 to-seal-500 hover:from-seal-600 hover:to-seal-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md hover:shadow-lg transition-all active:scale-95 btn-bounce"
                                >
                                    <PlusIcon className="w-3 h-3" />
                                    在此处记录新故事
                                </button>
                            )}
                        </div>
                    </Popup>
                )}
                </Marker>
            );
        })}

        <MapUpdater event={selectedEvent} flyToCoords={flyToCoords} activeJourneySegment={activeJourneySegment} />

        {!isAddingLocation && <MapBackgroundClickHandler onDeselect={() => onSelectEvent(null)} />}

        {isAddingLocation && <MapClickHandler onMapClick={handlePreviewClick} />}

        <MapControls
            isEditMode={isEditMode}
            onToggleEdit={() => setIsEditMode(!isEditMode)}
        />

        </MapContainer>

    </>
  );
};

export default MapView;
