import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearCart } from '../store/cartSlice';
import api from '../api/axios';

const PaymentResult = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [verifying, setVerifying] = useState(true);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const orderNumber = searchParams.get('orderNumber') || '';
    const status = searchParams.get('status') || '';
    const txnId = searchParams.get('txnId') || '';

    useEffect(() => {
        const verifyPayment = async () => {
            if (!orderNumber) {
                setResult({ success: false, message: 'Invalid payment response.' });
                setVerifying(false);
                return;
            }

            // Retrieve stored order data
            const storedOrderId = sessionStorage.getItem('paytm_order_id');
            const isDirectBuy = sessionStorage.getItem('paytm_is_direct_buy') === 'true';

            if (status === 'TXN_SUCCESS') {
                try {
                    // Verify with the server
                    const verifyRes = await api.post('/payments/verify', {
                        orderId: storedOrderId ? parseInt(storedOrderId) : undefined,
                        orderNumber: orderNumber,
                        response: { STATUS: status, TXNID: txnId, ORDERID: orderNumber },
                    });

                    if (verifyRes.data.status === 'success') {
                        if (!isDirectBuy) {
                            dispatch(clearCart());
                        }
                        setResult({ success: true, message: `Payment successful! Order ID: ${orderNumber}` });
                    } else {
                        setResult({ success: false, message: 'Payment verification failed. Please contact support.' });
                    }
                } catch {
                    setResult({ success: false, message: 'Could not verify payment. Please contact support.' });
                }
            } else if (status === 'TXN_FAILURE') {
                setResult({ success: false, message: 'Payment failed. Please try again.' });
            } else if (status === 'PENDING') {
                setResult({ success: false, message: 'Payment is pending. We will update you shortly.' });
            } else {
                setResult({ success: false, message: 'An error occurred during payment.' });
            }

            // Clean up sessionStorage
            sessionStorage.removeItem('paytm_order_id');
            sessionStorage.removeItem('paytm_order_number');
            sessionStorage.removeItem('paytm_is_direct_buy');
            setVerifying(false);
        };

        verifyPayment();
    }, [orderNumber, status, txnId, dispatch]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            padding: '2rem',
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '500px',
                padding: '3rem 2rem',
                borderRadius: '16px',
                background: '#fff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}>
                {verifying ? (
                    <>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                        <h2>Verifying Payment...</h2>
                        <p style={{ color: '#666' }}>Please wait while we confirm your payment.</p>
                    </>
                ) : result ? (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                            {result.success ? '✅' : '❌'}
                        </div>
                        <h2 style={{ color: result.success ? '#16a34a' : '#dc2626' }}>
                            {result.success ? 'Payment Successful!' : 'Payment Failed'}
                        </h2>
                        <p style={{ color: '#666', marginBottom: '2rem' }}>{result.message}</p>
                        {result.success ? (
                            <button
                                onClick={() => navigate('/profile')}
                                style={{
                                    padding: '12px 32px',
                                    background: '#1a1a2e',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                }}
                            >
                                View Orders
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/cart')}
                                style={{
                                    padding: '12px 32px',
                                    background: '#1a1a2e',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                }}
                            >
                                Back to Cart
                            </button>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default PaymentResult;
