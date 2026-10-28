import React, { useState } from 'react';
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

        <button className="btn" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
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
        {/* Interactive GIS Map Canvas Area */}
        <div className="glass-panel" style={{
          position: 'relative',
          minHeight: '620px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#09101c',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Simulated Satellite Terrain Map Background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundImage: `radial-gradient(ellipse at 40% 60%, rgba(30, 58, 40, 0.9), rgba(10, 20, 35, 0.98)),
              repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px)`,
            filter: 'contrast(1.15) brightness(0.95)'
          }}>
            {/* Thailand Map Contour Overlay */}
            <svg viewBox="0 0 800 600" style={{ width: '100%', height: '100%', opacity: 0.65 }}>
              <path
                d="M 380 80 Q 420 120 400 200 Q 450 240 430 310 Q 390 350 370 410 Q 360 480 340 550"
                fill="none"
                stroke="rgba(16, 185, 129, 0.15)"
                strokeWidth="60"
                strokeLinecap="round"
              />
              <path
                d="M 380 80 Q 420 120 400 200 Q 450 240 430 310 Q 390 350 370 410 Q 360 480 340 550"
                fill="none"
                stroke="rgba(6, 182, 212, 0.25)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            </svg>
          </div>

          {/* Top-Left Map Controls: Satellite / Street / Terrain */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 10,
            display: 'flex',
            gap: '4px',
            background: 'rgba(10, 15, 26, 0.85)',
            backdropFilter: 'blur(10px)',
            padding: '5px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setMapLayer('satellite')}
              style={{
                background: mapLayer === 'satellite' ? '#ffffff' : 'transparent',
                color: mapLayer === 'satellite' ? '#000000' : '#cbd5e1',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
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
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
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
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
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
              background: 'rgba(10, 15, 26, 0.85)',
              backdropFilter: 'blur(10px)',
              padding: '5px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                <Crosshair size={13} /> Fit All
              </button>
              <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                <Layers size={13} /> Focus
              </button>
              <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
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
            gap: '8px'
          }}>
            <div className="badge" style={{ background: 'rgba(10, 15, 26, 0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              <span className="pulse-dot" /> แผนที่พร้อมใช้งาน ZOOM 6
            </div>
            <div className="badge" style={{ background: 'rgba(10, 15, 26, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
              GIS Layer: {mapLayer.toUpperCase()}
            </div>
          </div>

          {/* Interactive Farm Pins on Map */}
          {/* 1. Chiang Mai Pin */}
          <div
            onClick={() => setSelectedFarm('farm-004')}
            style={{
              position: 'absolute',
              top: '22%',
              left: '42%',
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: 20
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50% 50% 50% 0',
              background: selectedFarm === 'farm-004' ? '#f59e0b' : '#ea580c',
              transform: 'rotate(-45deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.7)',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ transform: 'rotate(45deg)', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>
                📍
              </span>
            </div>
          </div>

          {/* 2. Bangkok Demo Center Pin */}
          <div
            onClick={() => setSelectedFarm('farm-001')}
            style={{
              position: 'absolute',
              top: '56%',
              left: '47%',
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: 20
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50% 50% 50% 0',
              background: selectedFarm === 'farm-001' ? '#10b981' : '#059669',
              transform: 'rotate(-45deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ transform: 'rotate(45deg)', color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>
                🌾
              </span>
            </div>
          </div>

          {/* 3. Chonburi Pin */}
          <div
            onClick={() => setSelectedFarm('farm-003')}
            style={{
              position: 'absolute',
              top: '64%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: 20
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50% 50% 50% 0',
              background: selectedFarm === 'farm-003' ? '#10b981' : '#0d9488',
              transform: 'rotate(-45deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.6)'
            }}>
              <span style={{ transform: 'rotate(45deg)', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>
                🌱
              </span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredFarms.map((farm) => {
                const isSelected = selectedFarm === farm.id;
                return (
                  <div
                    key={farm.id}
                    onClick={() => setSelectedFarm(farm.id)}
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
