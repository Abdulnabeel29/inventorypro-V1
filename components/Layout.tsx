
import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SmartCopilot from './SmartCopilot';

const Layout: React.FC = () => {
  const mainRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Scroll to top of main content whenever the route changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
      <SmartCopilot />
    </div>
  );
};

export default Layout;
