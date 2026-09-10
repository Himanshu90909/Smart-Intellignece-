import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../store/toast';
import type { Product } from '../../types';

/** Floating compare bar — mirrors the original app's bottom bar. */
export function CompareBar({ products }: { products: Product[] }) {
  const { compareIds, toggleCompare, clearCompare, COMPARE_LIMIT } = useAppStore();
  const { toast } = useToast();
  if (!compareIds.length) return null;

  const byId = (id: number) => products.find((p) => p.id === id);

  return (
    <div className="compare-bar show" role="region" aria-label="Compare selection">
      <div className="compare-items">
        {compareIds.map((id) => {
          const p = byId(id);
          if (!p) return null;
          return (
            <div key={id} className="compare-item">
              <img src={p.image} alt="" />
              {p.name.split(' ').slice(0, 3).join(' ')}
              <button
                className="c-rm"
                onClick={() => { toggleCompare(id); toast('Removed from compare'); }}
                aria-label={`Remove ${p.name} from compare`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button className="c-clear" onClick={clearCompare}>Clear</button>
      {compareIds.length >= 2 ? (
        <Link className="c-go" to={`/compare?ids=${compareIds.join(',')}`}>
          Compare ({compareIds.length}/{COMPARE_LIMIT}) →
        </Link>
      ) : (
        <button className="c-go" onClick={() => toast('Add at least 2 products first')}>
          Compare ({compareIds.length}/{COMPARE_LIMIT}) →
        </button>
      )}
    </div>
  );
}
