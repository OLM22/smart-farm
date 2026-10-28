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
  ExternalLink 
} from 'lucide-react';
import type { FarmLocation } from '../types';

interface GisMapTabProps {
  onSelectFarmForDashboard?: (farmId: string) => void;
}

export const GisMapTab: React.FC<GisMapTabProps> = ({ onSelectFarmForDashboard }) => {
  const [mapLayer, setMapLayer] = useState<'satellite' | 'street' | 'terrain'>('satellite');
  const [selectedFarm, setSelectedFarm] = useState<string>('farm-001');
  const [searchQuery, setSearchQuery] = useState('');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const farms: FarmLocation[] = [
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

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Thailand
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

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Create markers for each farm with custom CSS pins
    farms.forEach((farm) => {
      const isDemo = farm.id === 'farm-001';
      const isHighland = farm.id === 'farm-004';
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

      // Popup
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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

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
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds(farms.map(f => [f.lat, f.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
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
            สำรวจตำแหน่ง Farm แบบ Interactive, ตรวจสถานะพื้นที่ และนำทางไปยัง Dashboard ได้จากศูนย์ควบคุมเดียว โดยแสดงเฉพาะข้อมูลตามสิทธิ์ของผู้ใช้
          </p>
        </div>

        <button className="btn" style={{ background: 'rgba(255, 255, 255, 0.08)' }} onClick={handleFitAll}>
          <RefreshCw size={15} />
          Refresh GIS Data
        </button>
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
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>4</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>จาก 4 Farm ทั้งหมด</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            <CheckCircle2 size={14} /> Active Sites
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>3</div>
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
            <Crosshair size={14} /> Missing GPS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>0</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ไม่ต้องเติมพิกัดเพื่อแสดงหมุด</div>
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
          border: '1px solid rgba(255, 255, 255, 0.1)'
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
              zIndex: 1
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
              <span className="pulse-dot" /> แผนที่ดาวเทียมความละเอียดสูง (Live GIS)
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

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px' }}>
              Farm Locations
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
              เลือก Farm เพื่อ Fly-To และตรวจข้อมูลตำแหน่ง
            </p>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
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

            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{filteredFarms.length} จาก 4 จุดพิกัด</span>
              <span style={{ fontStyle: 'italic' }}>Click to Fly-To</span>
            </div>

            {/* Farm Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '440px', overflowY: 'auto' }}>
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
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
