import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { syncCartWithServer } from "../store/cartSlice";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowRight, Smartphone } from "lucide-react";
import { auth } from "../config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Recaptcha
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;

    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      window.confirmationResult = confirmationResult;
      setShowOtpInput(true);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError("Failed to send OTP. Please check the number and try again.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Verify OTP with Firebase
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;
      const idToken = await user.getIdToken();

      // 2. Send Token to Backend
      const res = await api.post("/auth/login-otp", { idToken });

      const loggedInUser = res.data.user;

      dispatch(
        loginSuccess({
          user: loggedInUser,
          token: res.data.token,
        })
      );

      // Sync Cart (Merge guest & server)
      // @ts-ignore
      dispatch(syncCartWithServer());

      // 3. Redirect
      if (loggedInUser.roles && loggedInUser.roles.length > 0) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"
          alt="Urbaniegh Fashion"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 text-white p-12">
          <h2 className="text-4xl font-bold mb-4">Welcome Back</h2>
          <p className="text-lg text-gray-100">
            Login seamlessly with your mobile number.
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-4">
              <div className="bg-black text-white p-2 rounded-lg">
                <ShoppingBag size={24} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Sign in / Register
            </h2>
            <p className="mt-2 text-gray-500">Use your mobile number to continue.</p>
          </div>

          {!showOtpInput ? (
            <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
              {error && <div className="text-red-600 text-sm text-center">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm"
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div id="recaptcha-container"></div>

              <button
                type="submit"
                disabled={loading || phoneNumber.length < 10}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending OTP..." : "Get OTP"} <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
              {error && <div className="text-red-600 text-sm text-center">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-lg tracking-widest text-center"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Sent to +91 {phoneNumber}
                  <button type="button" onClick={() => setShowOtpInput(false)} className="ml-2 text-black underline">Change?</button>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
