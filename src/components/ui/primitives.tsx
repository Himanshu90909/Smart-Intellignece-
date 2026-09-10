import type { CSSProperties, ReactNode } from 'react';

/** Lazy image with skeleton fade-in and graceful fallback on error. */
export function LazyImage({ src, alt, className, style, eager = false }: {
  src: string; alt: string; className?: string; style?: CSSProperties; eager?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={style}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.fallback) {
          img.dataset.fallback = '1';
          img.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=60';
        }
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skel" aria-hidden="true">
      <div className="skel-img" />
      <div className="skel-line" style={{ width: '60%' }} />
      <div className="skel-line" style={{ width: '80%' }} />
      <div className="skel-line" style={{ width: '40%' }} />
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: {
  icon: string; title: string; message: string; action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="big" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="error-state" role="alert">
      <div className="big" aria-hidden="true">⚠️</div>
      <h3>Something went wrong</h3>
      <p>{message || 'Please try again.'}</p>
      {onRetry && (
        <button className="btn-ghost" style={{ marginTop: 14 }} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Badge({ kind, label }: { kind: string; label: string }) {
  return <div className={`pc-badge ${kind}`}>{label}</div>;
}
