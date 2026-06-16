import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FileText, ShieldAlert, History, LayoutDashboard, LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload-policy', label: 'Upload Policy', icon: FileText },
    { path: '/claim-history', label: 'Claim History', icon: History }
  ];

  return (
    <nav className="bg-[#f4f6fa] sticky top-0 z-50 px-4 py-3 sm:px-6 shadow-md border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-blue-500/10">
            C
          </div>
          <div>
            <span className="font-extrabold text-xl text-slate-800 tracking-wide">Claim<span className="text-gradient">Copilot</span></span>
            <span className="block text-[9px] text-slate-500 font-medium tracking-widest uppercase">Indian Health Insurance</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive(item.path)
                    ? 'neu-inset text-blue-600'
                    : 'text-slate-650 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <Icon size={14} className={isActive(item.path) ? 'text-blue-600' : 'text-slate-500'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>



        {/* User profile & Logout */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-extrabold text-slate-700">{user.name}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Policyholder</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 border border-transparent hover:border-rose-300/30 transition-all duration-200"
            title="Log Out"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
