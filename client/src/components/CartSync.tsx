import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import axios from 'axios';

// This component is "headless" (renders nothing)
// It just listens to Redux state and syncs to Backend
const CartSync = () => {
    const { items, totalAmount } = useSelector((state: RootState) => state.cart);
    const { token } = useSelector((state: RootState) => state.auth);

    // Config: Base URL is likely localhost:5000 or relative if proxy set
    const BASE_URL = 'import.meta.env.VITE_API_URL';

    // Debounce Ref
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Skip sync on initial mount to avoid overwriting backend with empty local if that's the case
        // BUT here local storage is the "truth" for the user session, so maybe we DO want to sync immediately?
        // Let's debounce it anyway.

        if (!token) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            try {
                // Prepare payload
                // Backend expects: { items: [{ variantId, quantity }] }
                const payload = {
                    items: items.map(item => ({
                        variantId: item.id, // Redux stores Variant ID as 'id'
                        quantity: item.quantity
                    }))
                };

                await axios.post(`${BASE_URL}/cart/sync`, payload, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    withCredentials: true // For cookies
                });
                console.log('Cart synced to backend');
            } catch (error) {
                console.error('Failed to sync cart:', error);
            }
        }, 2000); // 2 second debounce

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };

    }, [items, token, totalAmount]); // Sync whenever items or total changes

    return null;
};

export default CartSync;
