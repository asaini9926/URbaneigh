import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-black text-white flex items-center justify-center rounded-lg">
                <ShoppingBag size={24} />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Create an account</h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm space-y-4">
            <input required placeholder="Full Name" className="w-full border p-3 rounded" 
                onChange={e => setFormData({...formData, name: e.target.value})} />
            <input required type="email" placeholder="Email address" className="w-full border p-3 rounded" 
                onChange={e => setFormData({...formData, email: e.target.value})} />
            <input required placeholder="Phone Number" className="w-full border p-3 rounded" 
                onChange={e => setFormData({...formData, phone: e.target.value})} />
            <input required type="password" placeholder="Password" className="w-full border p-3 rounded" 
                onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <button type="submit" className="w-full flex justify-center py-3 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800">
            Sign up
          </button>
          
          <div className="text-center text-sm">
            <Link to="/login" className="font-medium text-black hover:underline">Already have an account? Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;