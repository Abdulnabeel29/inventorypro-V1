
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import PurchaseOrders from './pages/PurchaseOrders';
import Returns from './pages/Returns';
import AgingReport from './pages/AgingReport';
import Suppliers from './pages/Suppliers';
import AIAnalysis from './pages/AIAnalysis';
import ReportLogs from './pages/ReportLogs';
import Activities from './pages/Activities';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Tasks from './pages/Tasks';
import Warehouses from './pages/Warehouses';
import ProductAnalysisIndex from './pages/ProductAnalysisIndex';
import ProductAnalysis from './pages/ProductAnalysis';
import Login from './pages/Login';
import { DataProvider } from './context/DataContext';

// Simple Mock Auth Context
interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <DataProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route
              path="/"
              element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
            >
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="analysis/products" element={<ProductAnalysisIndex />} />
              <Route path="analysis/products/:id" element={<ProductAnalysis />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="products" element={<Products />} />
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="orders" element={<Orders />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="returns" element={<Returns />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="aging-report" element={<AgingReport />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="analysis" element={<AIAnalysis />} />
              <Route path="reports/logs" element={<ReportLogs />} />
              <Route path="activities" element={<Activities />} />
            </Route>
          </Routes>
        </HashRouter>
      </DataProvider>
    </AuthContext.Provider>
  );
};

export default App;
