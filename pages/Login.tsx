import React, { useContext } from 'react';
import { AuthContext } from '../App';
import { Package } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useContext(AuthContext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <Package className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Welcome Back</h2>
        <p className="text-center text-slate-500 mb-8">Sign in to InventoryPro</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              defaultValue="admin@demo.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              defaultValue="password"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Sign In
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Demo Mode: Just click Sign In
        </p>
      </div>
    </div>
  );
};

export default Login;