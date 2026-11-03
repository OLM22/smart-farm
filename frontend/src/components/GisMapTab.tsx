import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  RefreshCw, 
  Layers, 
  Crosshair, 
  Maximize2, 
  Search, 
  ShieldCheck, 
  Compass, 
  CheckCircle2, 
  ExternalLink,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import type { FarmLocation } from '../types';

interface GisMapTabProps {
  onSelectFarmForDashboard?: (farmId: string) => void;
}

const DEFAULT_FARMS: FarmLocation[] = [
  {
    id: 'farm-001',
    name: 'CRU Demo Center (กรุงเทพฯ)',
    lat: 13.8055,
    lng: 100.5744,
    status: 'ACTIVE',
    zonesCount: 3,
    description: 'ศูนย์สาธิตระบบสมาร์ทฟาร์มและแปลงเพาะเลี้ยงตัวอย่าง'
  },
  {
    id: 'farm-002',
    name: 'CRU Algae Greenhouse (กรุงเทพฯ)',
    lat: 13.8062,
    lng: 100.5750,
    status: 'ACTIVE',
    zonesCount: 3,
    description: 'โรงเรือนเพาะเลี้ยงสาหร่ายเซลล์เดียวและไมโครอัลจี'
  },
  {
    id: 'farm-003',
    name: 'CRU Organic Farm (ชลบุรี)',
    lat: 13.3611,
    lng: 100.9847,
    status: 'ACTIVE',
    zonesCount: 4,
    description: 'แปลงเกษตรอินทรีย์พืชผักสลัดและระบบน้ำอัตโนมัติ'
  },
  {
    id: 'farm-004',
    name: 'CRU Smart Highlands (เชียงใหม่)',
    lat: 18.7883,
    lng: 98.9853,
    status: 'ACTIVE',
    zonesCount: 2,
    description: 'แปลงวิจัยพืชเมืองหนาวและสถานีตรวจวัดสภาพอากาศ'
  }
];

export const GisMapTab: React.FC<GisMapTabProps> = ({ onSelectFarmForDashboard }) => {
  const [mapLayer, setMapLayer] = useState<'satellite' | 'street' | 'terrain'>('satellite');
  const [selectedFarm, setSelectedFarm] = useState<string>('farm-001');
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved farms from localStorage or fallback to DEFAULT_FARMS
  const [farms, setFarms] = useState<FarmLocation[]>(() => {
    try {
      const saved = localStorage.getItem('cru_farm_locations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_FARMS;
  });

  // Pin-Drop & Add Farm Form State
  const [pinMode, setPinMode] = useState(false);
  const [pickedCoord, setPickedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const previewMarkerRef = useRef<L.Marker | null>(null);

  // Save to localStorage whenever farms change
  useEffect(() => {
    try {
      localStorage.setItem('cru_farm_locations', JSON.stringify(farms));
    } catch { /* ignore */ }
  }, [farms]);

  // Tile URL providers
  const getTileUrl = (layer: 'satellite' | 'street' | 'terrain') => {
    switch (layer) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      case 'street':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileAttribution = (layer: 'satellite' | 'street' | 'terrain') => {
    switch (layer) {
      case 'satellite':
        return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      case 'terrain':
        return 'Map data: &copy; OpenTopoMap (CC-BY-SA)';
      case 'street':
      default:
        return '&copy; OpenStreetMap contributors';
    }
  };

  // Place or move the temporary Red Preview Pin when user clicks map
  const placePreviewPin = (lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setPickedCoord({ lat, lng });
    setPinMode(true);

    if (previewMarkerRef.current) {
      previewMarkerRef.current.setLatLng([lat, lng]);
      previewMarkerRef.current.openPopup();
      return;
    }

    const previewIcon = L.divIcon({
      className: 'preview-farm-pin',
      html: `
        <div style="
          width: 42px;
          height: 42px;
          border-radius: 50% 50% 50% 0;
          background: #f43f5e;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 22px rgba(244, 63, 94, 0.9);
          border: 3px solid #ffffff;
          cursor: grab;
        ">
          <span style="transform: rotate(45deg); color: #fff; font-size: 18px; font-weight: bold;">
            📍
          </span>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 42],
      popupAnchor: [0, -42]
    });

    const pMarker = L.marker([lat, lng], { icon: previewIcon, draggable: true }).addTo(map);
    pMarker.bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; text-align: center; min-width: 160px;">
        <div style="font-weight: 800; color: #e11d48; font-size: 13px;">📍 จุดปักหมุดใหม่ (ลากเลื่อนได้)</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">ตั้งชื่อฟาร์มด้านขวาแล้วกดบันทึกได้เลย</div>
      </div>
    `).openPopup();

    pMarker.on('dragend', () => {
      const pos = pMarker.getLatLng();
      setPickedCoord({ lat: pos.lat, lng: pos.lng });
    });

    previewMarkerRef.current = pMarker;
  };

  // Remove temporary preview pin
  const clearPreviewPin = () => {
    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
    setPickedCoord(null);
    setPinMode(false);
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.5, 100.8],
      zoom: 6,
      zoomControl: false,
      attributionControl: false
    });

    const tileLayer = L.tileLayer(getTileUrl('satellite'), {
      maxZoom: 19,
      attribution: getTileAttribution('satellite')
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Clicking anywhere on the map drops the red pin immediately!
    map.on('click', (e: L.LeafletMouseEvent) => {
      placePreviewPin(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync saved farm markers whenever `farms` array changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    farms.forEach((farm) => {
      const isDemo = farm.id === 'farm-001';
      const isHighland = farm.id === 'farm-004' || farm.lat > 16;
      const bgColor = isHighland ? '#f59e0b' : '#10b981';
      const iconEmoji = isHighland ? '📍' : isDemo ? '🌾' : '🌱';

      const customIcon = L.divIcon({
        className: 'custom-farm-pin',
        html: `
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            background: ${bgColor};
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 16px ${bgColor}99;
            border: 2px solid #ffffff;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <span style="transform: rotate(45deg); color: #fff; font-size: 14px; font-weight: bold;">
              ${iconEmoji}
            </span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
      });

      const marker = L.marker([farm.lat, farm.lng], { icon: customIcon }).addTo(map);

      const popupHtml = `
        <div style="font-family: sans-serif; color: #0f172a; min-width: 180px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">${farm.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">พิกัด: ${farm.lat.toFixed(4)}, ${farm.lng.toFixed(4)}</div>
          <div style="display: inline-block; background: #ecfdf5; color: #059669; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; margin-bottom: 8px;">● ${farm.status}</div>
          <div style="font-size: 12px; color: #334155; line-height: 1.4;">${farm.description}</div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedFarm(farm.id);
      });

      markersRef.current[farm.id] = marker;
    });
  }, [farms]);

  // Update tile layer when layer state changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newLayer = L.tileLayer(getTileUrl(mapLayer), {
      maxZoom: 19,
      attribution: getTileAttribution(mapLayer)
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [mapLayer]);

  // Handle Fly-To farm
  const handleFlyTo = (farm: FarmLocation) => {
    setSelectedFarm(farm.id);
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([farm.lat, farm.lng], 13, {
      duration: 1.5,
      easeLinearity: 0.25
    });

    const marker = markersRef.current[farm.id];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 1500);
    }
  };

  // Handle Fit All
  const handleFitAll = () => {
    if (!mapInstanceRef.current || farms.length === 0) return;
    const bounds = L.latLngBounds(farms.map(f => [f.lat, f.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
  };

  // Start Pin Mode at current map center if user clicks button first
  const handleTogglePinMode = () => {
    if (pinMode) {
      clearPreviewPin();
    } else {
      const center = mapInstanceRef.current?.getCenter() || { lat: 13.8058, lng: 100.5748 };
      placePreviewPin(center.lat, center.lng);
    }
  };

  // Save New Farm Location from dropped pin
  const handleAddFarm = (e: React.FormEvent) => {
    e.preventDefault();
    const coord = pickedCoord || { lat: 13.8058, lng: 100.5748 };
    const finalName = newName.trim() || `CRU Smart Plot #${farms.length + 1}`;

    const newFarm: FarmLocation = {
      id: `farm-${Date.now().toString().slice(-4)}`,
      name: finalName,
      lat: coord.lat,
      lng: coord.lng,
      status: 'ACTIVE',
      zonesCount: 3,
      description: newDesc.trim() || 'แปลงเพาะปลูกภายใต้ระบบ CRU Smart Farm AIoT'
    };

    const updated = [...farms, newFarm];
    setFarms(updated);
    setNewName('');
    setNewDesc('');
    clearPreviewPin();
    setTimeout(() => handleFlyTo(newFarm), 150);
  };

  // Handle Delete Farm
  const handleDeleteFarm = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (farms.length <= 1) return;
    setFarms(farms.filter(f => f.id !== id));
  };

  const filteredFarms = farms.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 10px #10b981'
            }} />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
              แผนที่พิกัดฟาร์ม (GIS Location Intelligence)
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            💡 จิ้มคลิกจุดไหนก็ได้บนแผนที่เพื่อปักหมุดฟาร์มใหม่ทันที (หรือลากหมุดสีแดงเพื่อเลื่อนตำแหน่งได้ตามต้องการ)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn"
            style={{
              background: pinMode ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${pinMode ? '#f43f5e' : '#10b981'}`,
              color: pinMode ? '#fda4af' : '#34d399',
              fontWeight: 700
            }}
            onClick={handleTogglePinMode}
          >
            {pinMode ? <><X size={15} /> ยกเลิกการปักหมุด</> : <><MapPin size={15} /> จิ้มปักหมุดฟาร์มใหม่</>}
          </button>
          <button className="btn" style={{ background: 'rgba(255, 255, 255, 0.08)' }} onClick={handleFitAll}>
            <RefreshCw size={15} />
            Fit All ({farms.length})
          </button>
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            <MapPin size={14} /> Mapped Farms
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{farms.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>จาก {farms.length} Farm ทั้งหมด</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            <CheckCircle2 size={14} /> Active Sites
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{farms.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>พร้อมใช้งานบนแผนที่</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            <Compass size={14} /> Coverage
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>100%</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>มีพิกัด Latitude/Longitude</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            <Crosshair size={14} /> โหมดปักหมุด
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>คลิกบนแผนที่ได้ทันที</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>ไม่ต้องพิมพ์ตัวเลขพิกัดเอง</div>
        </div>
      </div>

      {/* Main Map + Right Scope Panel Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: '20px',
        alignItems: 'stretch'
      }}>
        {/* Real Leaflet Map Container */}
        <div className="glass-panel" style={{
          position: 'relative',
          minHeight: '640px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#09101c',
          border: pinMode ? '2px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Map Mount Point */}
          <div 
            ref={mapContainerRef} 
            style={{ 
              width: '100%', 
              height: '100%', 
              minHeight: '640px',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              cursor: 'crosshair'
            }} 
          />

          {/* Top-Left Map Controls: Satellite / Street / Terrain */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 10,
            display: 'flex',
            gap: '4px',
            background: 'rgba(10, 15, 26, 0.9)',
            backdropFilter: 'blur(12px)',
            padding: '5px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => setMapLayer('satellite')}
              style={{
                background: mapLayer === 'satellite' ? '#ffffff' : 'transparent',
                color: mapLayer === 'satellite' ? '#000000' : '#cbd5e1',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapLayer('street')}
              style={{
                background: mapLayer === 'street' ? '#ffffff' : 'transparent',
                color: mapLayer === 'street' ? '#000000' : '#cbd5e1',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Street
            </button>
            <button
              onClick={() => setMapLayer('terrain')}
              style={{
                background: mapLayer === 'terrain' ? '#ffffff' : 'transparent',
                color: mapLayer === 'terrain' ? '#000000' : '#cbd5e1',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Terrain
            </button>
          </div>

          {/* Top-Right Map Controls: Fit All, Focus, Full */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 10,
            display: 'flex',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(10, 15, 26, 0.9)',
              backdropFilter: 'blur(12px)',
              padding: '5px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
              <button 
                className="btn" 
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={handleFitAll}
              >
                <Crosshair size={13} /> Fit All
              </button>
              <button 
                className="btn" 
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => {
                  const target = farms.find(f => f.id === selectedFarm);
                  if (target) handleFlyTo(target);
                }}
              >
                <Layers size={13} /> Focus
              </button>
              <button 
                className="btn" 
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => {
                  if (mapContainerRef.current) {
                    if (!document.fullscreenElement) {
                      mapContainerRef.current.requestFullscreen().catch(() => {});
                    } else {
                      document.exitFullscreen().catch(() => {});
                    }
                  }
                }}
              >
                <Maximize2 size={13} /> Full
              </button>
            </div>
          </div>

          {/* Map Info Chips on Left */}
          <div style={{
            position: 'absolute',
            top: '75px',
            left: '20px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none'
          }}>
            <div className="badge" style={{ background: 'rgba(10, 15, 26, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399' }}>
              <span className="pulse-dot" /> คลิกจุดใดก็ได้บนแผนที่เพื่อปักหมุดใหม่ทันที
            </div>
            <div className="badge" style={{ background: 'rgba(10, 15, 26, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8' }}>
              GIS Layer: {mapLayer.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Right Scope Panel: Authorized Farm Scope */}
        <div className="glass-panel" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                AUTHORIZED FARM SCOPE
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                <ShieldCheck size={12} /> VERIFIED
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Farm Locations
              </h3>
              <button
                className="btn"
                style={{ padding: '4px 10px', fontSize: '0.75rem', background: pinMode ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)', color: pinMode ? '#fb7185' : '#34d399' }}
                onClick={handleTogglePinMode}
              >
                {pinMode ? <><X size={13} /> ยกเลิก</> : <><Plus size={13} /> ปักหมุดเพิ่ม</>}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              👆 <b>จิ้มคลิกจุดบนแผนที่ได้เลย</b> หมุดสีแดงจะเด้งขึ้นมาโดยไม่ต้องพิมพ์เลขพิกัด
            </p>

            {/* Pin-Drop Save Box (Appears automatically when user clicks on map!) */}
            {pinMode && pickedCoord && (
              <form
                onSubmit={handleAddFarm}
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '2px solid #f43f5e',
                  borderRadius: '14px',
                  padding: '14px',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 8px 24px rgba(244, 63, 94, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fda4af' }}>
                    📍 เลือกจุดปักหมุดแล้ว (ลากเลื่อนหมุดสีแดงได้)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {pickedCoord.lat.toFixed(4)}, {pickedCoord.lng.toFixed(4)}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="ตั้งชื่อฟาร์ม (หรือกดบันทึกเลยก็ได้)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                />
                <button
                  type="submit"
                  className="btn"
                  style={{ background: '#10b981', color: '#052e16', fontWeight: 800, justifyContent: 'center', padding: '10px', fontSize: '0.88rem' }}
                >
                  ✅ ยืนยันปักหมุดฟาร์มจุดนี้
                </button>
              </form>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="ค้นหา Farm ใน Scope"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  height: '40px',
                  borderRadius: '10px',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{filteredFarms.length} จาก {farms.length} จุดพิกัด</span>
              <span style={{ fontStyle: 'italic' }}>Click to Fly-To</span>
            </div>

            {/* Farm Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredFarms.map((farm) => {
                const isSelected = selectedFarm === farm.id;
                return (
                  <div
                    key={farm.id}
                    onClick={() => handleFlyTo(farm)}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(10, 15, 26, 0.6)',
                      border: `1px solid ${isSelected ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: isSelected ? '#34d399' : '#f8fafc' }}>
                        {farm.name}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>
                        &bull; {farm.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <MapPin size={12} color="#f43f5e" />
                      <span>{farm.lat.toFixed(4)}, {farm.lng.toFixed(4)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: isSelected ? '#34d399' : '#60a5fa',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        &bull; Focus on map
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {farms.length > 1 && (
                          <button
                            className="btn"
                            title="ลบพิกัดนี้"
                            style={{ padding: '3px 7px', fontSize: '0.72rem', background: 'rgba(244,63,94,0.15)', color: '#fb7185' }}
                            onClick={(e) => handleDeleteFarm(farm.id, e)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button
                          className="btn"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectFarmForDashboard) onSelectFarmForDashboard(farm.id);
                          }}
                        >
                          <ExternalLink size={12} /> Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
