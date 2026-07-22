import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hourglass } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
}

const STYLE_OVERRIDE = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
  [data-cs] * { box-sizing: border-box; }
  [data-cs] h1 { font-family: 'Manrope', sans-serif !important; font-weight: 800 !important; color: #0f172a !important; }
  [data-cs] p { font-family: 'Inter', sans-serif !important; color: #64748b !important; }
`;

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div data-cs="true" style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8faff',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{STYLE_OVERRIDE}</style>
      
      {/* Background glow elements */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 50%, transparent 70%)',
        filter: 'blur(60px)',
        top: '-150px',
        left: '-150px',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(217,70,239,0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        bottom: '-150px',
        right: '-150px',
        pointerEvents: 'none'
      }} />

      {/* Main card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '24px',
        padding: '48px 32px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Animated Hourglass Icon Container */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
          border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <Hourglass style={{
            width: '32px',
            height: '32px',
            color: '#6366f1'
          }} />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '32px',
          lineHeight: '1.2',
          letterSpacing: '-0.02em',
          margin: '0 0 12px 0'
        }}>
          {title}
        </h1>

        {/* Message */}
        <p style={{
          fontSize: '15px',
          lineHeight: '1.6',
          margin: '0 0 32px 0'
        }}>
          We are currently crafting this feature. Tradelyze's advanced engineering is shaping this module. Stay tuned for a launch soon!
        </p>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 28px',
            fontSize: '14px',
            fontWeight: '700',
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 20px rgba(99,102,241,0.25)',
            transition: 'transform 0.2s ease, boxShadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(99,102,241,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.25)';
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
