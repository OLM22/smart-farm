import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Leaf } from 'lucide-react';
import type { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('olm22@gmail.com');
  const [password, setPassword] = useState('123456');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const user: User = {
        email: email.trim(),
        name: email.split('@')[0],
        role: 'SUPER_ADMIN',
        farmScope: 'ALL_FARMS'
      };

      if (rememberMe) {
        localStorage.setItem('cru_farm_user', JSON.stringify(user));
      }
      onLogin(user);
    }, 600);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at 50% -20%, rgba(16, 185, 129, 0.15), rgba(8, 12, 20, 1) 70%)'
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 36px',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            marginBottom: '16px'
          }}>
            <Leaf size={34} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            CRU Smart Farm
          </h2>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--accent-emerald)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            IOT PLATFORM &bull; MULTI-FARM
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            เข้าสู่ระบบศูนย์ปฏิบัติการและควบคุมฟาร์มแบบเรียลไทม์
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fecdd3',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              อีเมลผู้ใช้งาน (Email Address)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  width: '100%',
                  paddingLeft: '42px',
                  height: '44px',
                  borderRadius: '12px',
                  fontSize: '0.92rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              รหัสผ่าน (Password)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  paddingLeft: '42px',
                  height: '44px',
                  borderRadius: '12px',
                  fontSize: '0.92rem'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '26px',
            fontSize: '0.82rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--accent-emerald)', width: '16px', height: '16px' }}
              />
              จดจำการเข้าสู่ระบบ
            </label>

            <span style={{ color: 'var(--accent-emerald)', cursor: 'pointer' }}>
              สิทธิ์: SUPER_ADMIN
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              fontSize: '0.95rem',
              borderRadius: '12px',
              fontWeight: 700
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Security Footer Notice */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <Shield size={14} color="var(--accent-emerald)" />
          <span>ระบบแยกสิทธิ์ตาม Farm Isolation &bull; ปลอดภัยระดับ TLS</span>
        </div>
      </div>
    </div>
  );
};
