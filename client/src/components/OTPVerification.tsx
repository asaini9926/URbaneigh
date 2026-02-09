import { useState } from 'react';
import axios from 'axios';

interface OTPVerificationProps {
  orderId: number;
  orderNumber: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OTPVerification({
  orderId,
  orderNumber,
  amount,
  onClose,
  onSuccess,
}: OTPVerificationProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleRequestOTP = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      await axios.post(
        `import.meta.env.VITE_API_URL/cod/generate-otp`,
        { orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('OTP has been sent to your registered mobile number');
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `import.meta.env.VITE_API_URL/cod/verify-otp`,
        { orderId, otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Payment verified successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(
          err.response?.data?.error || `Invalid OTP. ${3 - newAttempts} attempts remaining.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Verify Payment</h2>
            {step === 'verify' && (
              <button
                onClick={() => {
                  setStep('request');
                  setOtp('');
                }}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Back
              </button>
            )}
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-gray-600">Order</p>
            <p className="font-semibold text-gray-900">#{orderNumber}</p>
            <p className="text-sm text-gray-600 mt-2">Amount to Pay</p>
            <p className="text-xl font-bold text-gray-900">₹{amount}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
              {success}
            </div>
          )}

          {step === 'request' ? (
            <div>
              <p className="text-gray-600 mb-6">
                Click the button below to receive an OTP on your registered mobile number. 
                You'll need to enter this OTP at the delivery to confirm the payment.
              </p>

              <button
                onClick={handleRequestOTP}
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Send OTP to Mobile'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Enter the 6-digit OTP sent to your mobile number:
              </p>

              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter OTP"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-indigo-600 focus:border-transparent mb-6"
              />

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6 || attempts >= 3}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed mb-3"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                onClick={handleRequestOTP}
                disabled={loading}
                className="w-full text-indigo-600 hover:text-indigo-700 font-medium py-2 transition"
              >
                {loading ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full text-gray-600 hover:text-gray-700 mt-4 py-2 font-medium transition"
          >
            Cancel
          </button>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t text-xs text-gray-600">
          <p className="font-semibold mb-2">How COD OTP Works:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>We send an OTP to verify the payment</li>
            <li>Share the OTP with the delivery agent</li>
            <li>Payment is confirmed once verified</li>
            <li>OTP expires in 2 hours</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
