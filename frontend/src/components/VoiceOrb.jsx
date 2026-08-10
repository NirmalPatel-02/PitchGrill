// state: 'idle' | 'speaking' | 'listening' | 'thinking'
// micLevel: 0-1, only used in 'listening' state, drives real-time scale
export default function VoiceOrb({ state = 'idle', micLevel = 0 }) {
  const listenScale = 1 + micLevel * 0.35;

  return (
    <div className={`orb-wrap orb-${state}`}>
      <div
        className="orb-ring orb-ring-outer"
        style={state === 'listening' ? { transform: `scale(${listenScale})` } : undefined}
      />
      <div
        className="orb-ring orb-ring-mid"
        style={state === 'listening' ? { transform: `scale(${1 + micLevel * 0.22})` } : undefined}
      />
      <div className="orb-core" />

      <style>{`
        .orb-wrap {
          position: relative;
          width: 148px;
          height: 148px;
          display: grid;
          place-items: center;
        }
        .orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid var(--color-accent);
          opacity: 0.35;
          transition: transform 0.08s ease-out;
        }
        .orb-ring-outer {
          width: 148px;
          height: 148px;
        }
        .orb-ring-mid {
          width: 112px;
          height: 112px;
          opacity: 0.5;
        }
        .orb-core {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, var(--color-accent-strong), var(--color-accent) 65%);
          box-shadow: 0 0 40px var(--color-accent-soft);
        }

        .orb-idle .orb-core {
          animation: orb-breathe 3.6s ease-in-out infinite;
        }
        .orb-idle .orb-ring-outer,
        .orb-idle .orb-ring-mid {
          animation: orb-breathe-ring 3.6s ease-in-out infinite;
        }

        .orb-speaking .orb-core {
          animation: orb-speak 0.85s ease-in-out infinite;
        }
        .orb-speaking .orb-ring-outer {
          animation: orb-speak-ring 0.85s ease-in-out infinite;
        }
        .orb-speaking .orb-ring-mid {
          animation: orb-speak-ring 0.85s ease-in-out infinite reverse;
        }

        .orb-listening .orb-core {
          background: radial-gradient(circle at 35% 30%, #ff8f8f, var(--color-danger) 65%);
          box-shadow: 0 0 44px var(--color-danger-soft);
        }
        .orb-listening .orb-ring-outer,
        .orb-listening .orb-ring-mid {
          border-color: var(--color-danger);
        }

        .orb-thinking .orb-core {
          animation: orb-think 1.2s linear infinite;
          background: conic-gradient(from 0deg, var(--color-accent), var(--color-accent-strong), var(--color-accent));
        }

        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes orb-breathe-ring {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.06); opacity: 0.55; }
        }
        @keyframes orb-speak {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.14); }
        }
        @keyframes orb-speak-ring {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.16); }
        }
        @keyframes orb-think {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
