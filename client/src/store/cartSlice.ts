import { createSlice } from '@reduxjs/toolkit';
import type{PayloadAction} from '@reduxjs/toolkit';
interface CartItem {
  id: number; // This is the VARIANT ID, not Product ID
  productId: number;
  title: string;
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

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<CartItem>) {
      const newItem = action.payload;
      const existingItem = state.items.find((item) => item.id === newItem.id);

      if (existingItem) {
        // If item exists, just increase quantity
        if (existingItem.quantity < existingItem.maxStock) {
            existingItem.quantity++;
            state.totalQuantity++;
            state.totalAmount += Number(newItem.price);
        }
      } else {
        // Add new item
        state.items.push({ ...newItem, quantity: 1 });
        state.totalQuantity++;
        state.totalAmount += Number(newItem.price);
      }
      
      // Save to local storage
      localStorage.setItem('cart', JSON.stringify(state));
    },
    removeFromCart(state, action: PayloadAction<number>) {
      const id = action.payload; // Variant ID
      const existingItem = state.items.find((item) => item.id === id);

      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.totalAmount -= Number(existingItem.price) * existingItem.quantity;
        state.items = state.items.filter((item) => item.id !== id);
      }
      localStorage.setItem('cart', JSON.stringify(state));
    },
    updateQuantity(state, action: PayloadAction<{ id: number; quantity: number }>) {
        const { id, quantity } = action.payload;
        const item = state.items.find(item => item.id === id);
        
        if (item && quantity > 0 && quantity <= item.maxStock) {
            // Calculate difference to update totals correctly
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

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;