import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Sliders, 
  Grid, 
  Bell, 
  BarChart2, 
  HardDrive, 
  Cpu, 
  Users, 
  Database, 
  Settings, 
  Leaf,
  ChevronRight
} from 'lucide-react';
import type { User } from '../types';

export type NavItemKey = 
  | 'dashboard' 
  | 'gis_map' 
  | 'controls' 
  | 'zones' 
  | 'alerts' 
  | 'reports' 
  | 'edge_gateway' 
  | 'hardware' 
  | 'users' 
  | 'database' 
  | 'settings';

interface SidebarProps {
  activeNav: NavItemKey;
  setActiveNav: (key: NavItemKey) => void;
  user: User;
  unreadAlerts: number;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  setActiveNav,
  user,
  unreadAlerts,
  collapsed
}) => {
  const sections = [
    {
      group: 'แดชบอร์ด & ภาพรวมระบบ',
      items: [
        { key: 'dashboard' as NavItemKey, label: 'แดชบอร์ด', icon: <LayoutDashboard size={18} /> },
        { key: 'gis_map' as NavItemKey, label: 'แผนที่พิกัดฟาร์ม', icon: <MapPin size={18} /> },
      ]
    },
    {
      group: 'การบริหารจัดการแปลงเกษตร',
      items: [
        { key: 'controls' as NavItemKey, label: 'ควบคุมอุปกรณ์', icon: <Sliders size={18} /> },
        { key: 'zones' as NavItemKey, label: 'โซนแปลงเกษตร', icon: <Grid size={18} /> },
      ]
    },
    {
      group: 'ศูนย์แจ้งเตือน & รายงาน',
      items: [
        { key: 'alerts' as NavItemKey, label: 'แจ้งเตือน', icon: <Bell size={18} />, badge: unreadAlerts },
        { key: 'reports' as NavItemKey, label: 'รายงานย้อนหลัง', icon: <BarChart2 size={18} /> },
        { key: 'edge_gateway' as NavItemKey, label: 'Edge Gateway', icon: <HardDrive size={18} /> },
      ]
    },
    {
      group: 'ตั้งค่า & บริหารระบบ',
      items: [
        { key: 'hardware' as NavItemKey, label: 'ฮาร์ดแวร์ & OTA', icon: <Cpu size={18} /> },
        { key: 'users' as NavItemKey, label: 'จัดการผู้ใช้ & สิทธิ์', icon: <Users size={18} /> },
        { key: 'database' as NavItemKey, label: 'จัดการฐานข้อมูล', icon: <Database size={18} /> },
        { key: 'settings' as NavItemKey, label: 'ตั้งค่าระบบฟาร์ม', icon: <Settings size={18} /> },
      ]
    }
  ];

  return (
    <aside style={{
      width: collapsed ? '80px' : '260px',
      background: '#0a0f1d',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100vh',
      position: 'sticky',
      top: 0,
      transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 100,
      userSelect: 'none'
    }}>
      {/* Brand Header */}
      <div>
        <div style={{
          padding: '20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}>
            <Leaf size={22} color="#ffffff" />
          </div>

          {!collapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                CRU Smart Farm
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.08em', fontWeight: 600 }}>
                IOT PLATFORM
              </div>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div style={{
          padding: '16px 12px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 170px)'
        }}>
          {sections.map((sec, sIdx) => (
            <div key={sIdx} style={{ marginBottom: '18px' }}>
              {!collapsed && (
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '4px 10px',
                  marginBottom: '6px'
                }}>
                  {sec.group}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {sec.items.map((item) => {
                  const isActive = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveNav(item.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'space-between',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 700 : 500,
                        background: isActive ? '#10b981' : 'transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none'
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: isActive ? '#ffffff' : '#94a3b8' }}>
                          {item.icon}
                        </span>
                        {!collapsed && <span>{item.label}</span>}
                      </div>

                      {!collapsed && (
                        <div>
                          {item.badge !== undefined && item.badge > 0 ? (
                            <span style={{
                              background: '#f43f5e',
                              color: '#ffffff',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '9999px'
                            }}>
                              {item.badge}
                            </span>
                          ) : (
                            isActive && <ChevronRight size={14} color="#ffffff" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Profile Widget */}
      <div style={{
        padding: '14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(5, 8, 14, 0.6)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* User Avatar */}
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.85rem',
            flexShrink: 0
          }}>
            {user.email.charAt(0).toUpperCase()}
          </div>

          {!collapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#ffffff',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }} title={user.email}>
                {user.email}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                &bull; {user.role}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                สิทธิ์ฟาร์ม: {user.farmScope}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
