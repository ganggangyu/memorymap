import React from 'react';

interface GISLayerControlProps {
  activeBaseLayer: string;
  onChangeBaseLayer: (layer: string) => void;
}

const LAYERS = [
  { id: 'amap', label: '高德', icon: '🗺️' },
  { id: 'satellite', label: '卫星', icon: '🛰️' },
];

const GISLayerControl: React.FC<GISLayerControlProps> = ({ activeBaseLayer, onChangeBaseLayer }) => (
  <div className="leaflet-top leaflet-right mt-28 safe-area-top mr-3 z-[1000]" style={{ pointerEvents: 'auto' }}>
    <div className="bg-paper-surface/90 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-1">
      {LAYERS.map(layer => (
        <button
          key={layer.id}
          onClick={() => onChangeBaseLayer(layer.id)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90 ${
            activeBaseLayer === layer.id ? 'bg-seal-100 text-seal-600 shadow-sm' : 'text-gray-500 hover:bg-paper-cream'
          }`}
          title={layer.label}
        >
          {layer.icon}
        </button>
      ))}
    </div>
  </div>
);

export default GISLayerControl;
