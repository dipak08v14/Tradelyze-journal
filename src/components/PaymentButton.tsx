import React, { useState } from 'react';

interface PaymentButtonProps {
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess?: () => void;
  className?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  userId,
  userEmail,
  userName,
  onSuccess,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 1. Create Razorpay order by calling backend api
      const response = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Razorpay Order');
      }

      const orderData = await response.json();
      const { orderId, amount, keyId } = orderData;

      // 2. Open Razorpay Checkout Dialog
      const options = {
        key: keyId,
        amount: amount,
        currency: 'INR',
        name: 'Tradelyze',
        description: 'Pro Subscription — ₹1,999/month',
        order_id: orderId,
        prefill: {
          email: userEmail || '',
          name: userName || '',
        },
        theme: {
          color: '#06b6d3', // Cyan-like accent matching design system
        },
        handler: async (response: any) => {
          try {
            // 3. Verify payment signature in backend api
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              if (onSuccess) {
                onSuccess();
              } else {
                window.location.reload();
              }
            } else {
              alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
            }
          } catch (err: any) {
            console.error('Error verifying payment:', err);
            alert('Error verifying payment: ' + err.message);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Payment error:', err);
      alert('Payment processing failed: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={`px-5 py-2.5 rounded-xl font-bold cursor-pointer transition-all duration-200 shadow-md ${className || 'bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-900'}`}
    >
      {loading ? 'Initializing Checkout...' : 'Upgrade to Pro — ₹1,999/mo'}
    </button>
  );
};
