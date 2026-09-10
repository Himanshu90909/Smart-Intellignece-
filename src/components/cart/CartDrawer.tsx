import { Link } from 'react-router-dom';
import { useCart } from '../../store/cart';
import { Drawer } from '../ui/Drawer';
import { formatPrice } from '../../lib/format';
import { cartSuggestions } from '../../lib/recommend';
import type { Product } from '../../types';
import { useToast } from '../../store/toast';
import { EmptyState } from '../ui/primitives';

export function CartDrawer({ products }: { products: Product[] }) {
  const { cart, isOpen, closeCart, changeQty, removeFromCart, subtotal, savings, count } = useCart();
  const { toast } = useToast();

  // recommendations computed from actual cart contents
  const cartProducts = cart.map((c) => ({ ...c }));
  const recs = cartSuggestions(cartProducts, products, 4);

  return (
    <Drawer open={isOpen} onClose={closeCart} title="Your Cart">
      <div className="cart-items">
        {cart.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            message="Start shopping with AI search!"
            action={<Link to="/" className="btn-primary" style={{ display: 'inline-block' }} onClick={closeCart}>Try AI Search ✨</Link>}
          />
        ) : (
          cart.map((item) => (
            <div className="ci" key={item.id}>
              <div className="ci-img"><img src={item.image} alt="" /></div>
              <div className="ci-info" style={{ flex: 1 }}>
                <Link to={`/product/${item.id}`} className="ci-name" onClick={closeCart}>{item.name}</Link>
                <div className="ci-price">{formatPrice(item.price)}</div>
                <div className="ci-qty">
                  <button className="qb" onClick={() => changeQty(item.id, -1)} aria-label={`Decrease quantity of ${item.name}`}>−</button>
                  <span className="qn" aria-label={`Quantity ${item.qty}`}>{item.qty}</span>
                  <button className="qb" onClick={() => changeQty(item.id, 1)} aria-label={`Increase quantity of ${item.name}`}>+</button>
                  <button className="ci-rm" onClick={() => { removeFromCart(item.id); toast('Removed from cart'); }} aria-label={`Remove ${item.name} from cart`}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {recs.length > 0 && (
        <div className="cart-recs">
          <h4>You might also like</h4>
          {recs.map((r) => (
            <Link key={r.product.id} to={`/product/${r.product.id}`} className="cart-rec" onClick={closeCart}>
              <img src={r.product.image} alt="" />
              <span>
                <span className="cart-rec-n">{r.product.name}</span><br />
                <span className="cart-rec-r">{r.reason}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="cart-foot">
          <div className="cart-tot">
            <span>Total ({count} items)</span>
            <span style={{ color: 'var(--accent3)' }}>{formatPrice(subtotal)}</span>
          </div>
          <div className="cart-save">🎉 You save {formatPrice(savings)} on this order!</div>
          <button
            className="chk-btn"
            onClick={() => toast('🚀 Demo checkout — payments are not part of this showcase build')}
          >
            Proceed to Checkout →
          </button>
          <p style={{ fontSize: 10, color: 'var(--dim)', marginTop: 8, textAlign: 'center' }}>
            Demo checkout — no real payment is processed
          </p>
        </div>
      )}
    </Drawer>
  );
}
