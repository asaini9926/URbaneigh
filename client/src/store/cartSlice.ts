import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../api/axios';
// import { RootState } from './store';
// Actually handling circular dependency in TS can be tricky. Let's assume RootState definition is separate or use `any` for getState to be safe.

interface CartItem {
  id: number; // This is the VARIANT ID
  productId: number;
  title: string;
  slug: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
  maxStock: number;
}

interface CartState {
  items: CartItem[];
  totalQuantity: number;
  totalAmount: number;
}

// Load from Local Storage if available
const savedCart = localStorage.getItem('cart');
const initialState: CartState = savedCart ? JSON.parse(savedCart) : {
  items: [],
  totalQuantity: 0,
  totalAmount: 0,
};

// --- Async Thunks ---

// Helper to map Server Cart to Client Cart
const mapServerCartToClient = (serverCart: any): CartState => {
  const items = serverCart.items.map((item: any) => ({
    id: item.variantId,
    productId: item.variant.productId,
    title: item.variant.product.title,
    slug: item.variant.product.slug,
    price: Number(item.variant.price),
    image: item.variant.images?.[0]?.url || '',
    color: item.variant.color,
    size: item.variant.size,
    quantity: item.quantity,
    maxStock: item.variant.inventory?.quantity || 0
  }));

  const totalQuantity = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
  const totalAmount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

  return { items, totalQuantity, totalAmount };
};

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { dispatch, getState }) => {
    const state = getState() as any;
    if (state.auth.isAuthenticated) {
      try {
        const res = await api.get('/cart');
        const cartData = mapServerCartToClient(res.data);
        dispatch(cartSlice.actions.setCart(cartData));
      } catch (error) {
        console.error("Failed to fetch cart", error);
      }
    }
  }
);

export const syncCartWithServer = createAsyncThunk(
  'cart/syncCart',
  async (_, { dispatch, getState }) => {
    const state = getState() as any;
    const localItems = state.cart.items;

    if (state.auth.isAuthenticated) {
      try {
        const res = await api.post('/cart/sync', { items: localItems });
        const cartData = mapServerCartToClient(res.data);
        dispatch(cartSlice.actions.setCart(cartData));
      } catch (error) {
        console.error("Failed to sync cart", error);
      }
    }
  }
);

export const addItemToCart = createAsyncThunk(
  'cart/addItem',
  async (item: CartItem, { dispatch, getState }) => {
    const state = getState() as any;
    if (state.auth.isAuthenticated) {
      try {
        const res = await api.post('/cart/add', { variantId: item.id, quantity: 1 });
        const cartData = mapServerCartToClient(res.data);
        dispatch(cartSlice.actions.setCart(cartData));
      } catch (error) {
        console.error("Failed to add item to server cart", error);
      }
    } else {
      dispatch(cartSlice.actions.addToCartLocal(item));
    }
  }
);

export const removeItemFromCart = createAsyncThunk(
  'cart/removeItem',
  async (variantId: number, { dispatch, getState }) => {
    const state = getState() as any;
    if (state.auth.isAuthenticated) {
      try {
        const res = await api.delete(`/cart/remove/${variantId}`);
        const cartData = mapServerCartToClient(res.data);
        dispatch(cartSlice.actions.setCart(cartData));
      } catch (error) {
        console.error("Failed to remove item from server cart", error);
      }
    } else {
      dispatch(cartSlice.actions.removeFromCartLocal(variantId));
    }
  }
);

export const updateItemQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ id, quantity }: { id: number; quantity: number }, { dispatch, getState }) => {
    const state = getState() as any;
    if (state.auth.isAuthenticated) {
      try {
        const res = await api.put('/cart/update', { variantId: id, quantity });
        const cartData = mapServerCartToClient(res.data);
        dispatch(cartSlice.actions.setCart(cartData));
      } catch (error) {
        console.error("Failed to update quantity on server", error);
      }
    } else {
      dispatch(cartSlice.actions.updateQuantityLocal({ id, quantity }));
    }
  }
);


const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart(state, action: PayloadAction<CartState>) {
      state.items = action.payload.items;
      state.totalQuantity = action.payload.totalQuantity;
      state.totalAmount = action.payload.totalAmount;
      localStorage.setItem('cart', JSON.stringify(state));
    },
    addToCartLocal(state, action: PayloadAction<CartItem>) {
      const newItem = action.payload;
      const existingItem = state.items.find((item) => item.id === newItem.id);

      if (existingItem) {
        if (existingItem.quantity < existingItem.maxStock) {
          existingItem.quantity++;
          state.totalQuantity++;
          state.totalAmount += Number(newItem.price);
        }
      } else {
        state.items.push({ ...newItem, quantity: 1 });
        state.totalQuantity++;
        state.totalAmount += Number(newItem.price);
      }
      localStorage.setItem('cart', JSON.stringify(state));
    },
    removeFromCartLocal(state, action: PayloadAction<number>) {
      const id = action.payload; // Variant ID
      const existingItem = state.items.find((item) => item.id === id);

      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.totalAmount -= Number(existingItem.price) * existingItem.quantity;
        state.items = state.items.filter((item) => item.id !== id);
      }
      localStorage.setItem('cart', JSON.stringify(state));
    },
    updateQuantityLocal(state, action: PayloadAction<{ id: number; quantity: number }>) {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id);

      if (item && quantity > 0 && quantity <= item.maxStock) {
        const diff = quantity - item.quantity;
        item.quantity = quantity;
        state.totalQuantity += diff;
        state.totalAmount += Number(item.price) * diff;
      }
      localStorage.setItem('cart', JSON.stringify(state));
    },
    clearCart(state) {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
      localStorage.removeItem('cart');
    }
  },
});

export const { setCart, addToCartLocal, removeFromCartLocal, updateQuantityLocal, clearCart } = cartSlice.actions;
export default cartSlice.reducer;