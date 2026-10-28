import React from 'react';
import { Menu, Shield, Lock, LogOut, Zap, User as UserIcon } from 'lucide-react';
import type { User } from '../types';

interface TopNavbarProps {
  user: User;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  onSimulate: () => void;
  isSyncing: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  user,
  onLogout,
  collapsed,
  setCollapsed,
  onSimulate,
  isSyncing
}) => {
  return (
    <header style={{
      height: '64px',
      background: '#0d1322',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      {/* Left Area: Toggle & Farm Scope */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="ย่อ/ขยาย เมนูด้านข้าง"
        >
          <Menu size={20} />
        </button>

        {/* Farm Scope Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '0.8rem'
        }}>
          <Shield size={14} color="#10b981" />
          <span style={{ color: '#94a3b8' }}>สโคปสิทธิ์การเข้าถึงฟาร์ม:</span>
          <span style={{ color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> {user.farmScope}
          </span>
        </div>
      </div>

      {/* Right Area: Role, User Email, Simulate & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Role Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.8rem',
          color: '#cbd5e1',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Shield size={14} color="#60a5fa" />
          <span>บทบาท: <strong>{user.role}</strong></span>
        </div>

        {/* User Pill Displaying user's actual email */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '5px 12px',
          borderRadius: '9999px'
        }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            <UserIcon size={14} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
            {user.email}
          </span>
        </div>

        {/* Simulate Data Button */}
        <button
          className="btn btn-primary"
          onClick={onSimulate}
          disabled={isSyncing}
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
        >
          <Zap size={14} />
          {isSyncing ? 'กำลังจำลอง...' : 'จำลองรับข้อมูล'}
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            background: 'rgba(244, 63, 94, 0.1)',
            color: '#fb7185',
            transition: 'all 0.2s ease'
          }}
        >
          <LogOut size={14} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </header>
  );
};
