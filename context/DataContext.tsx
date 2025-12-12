
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Product, Order, Supplier, Activity, Task, Return, PurchaseOrder, AppNotification, Location, LocationStock } from '../types';
import { mockProducts, mockOrders, mockSuppliers, mockActivities, mockTasks, mockReturns, mockPurchaseOrders, mockNotifications, mockLocations, mockLocationStocks } from '../services/mockData';

interface DataContextType {
  products: Product[];
  orders: Order[];
  suppliers: Supplier[];
  activities: Activity[];
  tasks: Task[];
  returns: Return[];
  purchaseOrders: PurchaseOrder[];
  notifications: AppNotification[];
  locations: Location[];
  locationStocks: LocationStock[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  writeOffProduct: (productId: string, quantity: number, reason: string) => void;
  addOrder: (order: Order) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  receivePurchaseOrder: (id: string) => void;
  refreshActivities: () => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  addReturn: (returnData: Return) => void;
  addNotification: (title: string, message: string, type: AppNotification['type'], link?: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  addLocation: (location: Location) => void;
  updateLocation: (location: Location) => void;
  deleteLocation: (id: string) => void;
  transferStock: (productId: string, fromLocationId: string, toLocationId: string, quantity: number, reason: string) => void;
  
  // Copilot State
  isCopilotOpen: boolean;
  toggleCopilot: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [returns, setReturns] = useState<Return[]>(mockReturns);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  
  // Locations & Stock
  const [locations, setLocations] = useState<Location[]>(() => {
      const saved = localStorage.getItem('inventory_locations');
      return saved ? JSON.parse(saved) : mockLocations;
  });
  const [locationStocks, setLocationStocks] = useState<LocationStock[]>(() => {
      const saved = localStorage.getItem('inventory_location_stocks');
      return saved ? JSON.parse(saved) : mockLocationStocks;
  });
  
  // Notification State with LocalStorage
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
      const saved = localStorage.getItem('inventory_notifications');
      return saved ? JSON.parse(saved) : mockNotifications;
  });

  // Copilot State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const toggleCopilot = () => setIsCopilotOpen(prev => !prev);

  // Save changes to LocalStorage
  useEffect(() => { localStorage.setItem('inventory_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('inventory_locations', JSON.stringify(locations)); }, [locations]);
  useEffect(() => { localStorage.setItem('inventory_location_stocks', JSON.stringify(locationStocks)); }, [locationStocks]);

  // Check for Overdue POs on Mount
  useEffect(() => {
      const checkOverduePOs = () => {
          const today = new Date();
          purchaseOrders.forEach(po => {
              if (po.status === 'Pending' || po.status === 'Delayed') {
                  const poDate = new Date(po.date);
                  const diffTime = Math.abs(today.getTime() - poDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays > 7) {
                      const alreadyNotified = notifications.some(n => 
                          n.link === `/purchase-orders` && 
                          n.message.includes(po.id) && 
                          new Date(n.timestamp).toDateString() === today.toDateString()
                      );
                      if (!alreadyNotified) {
                          addNotification('Overdue Purchase Order', `PO #${po.id} from ${po.supplierName} is pending for more than 7 days.`, 'warning', '/purchase-orders');
                      }
                  }
              }
          });
      };
      const timer = setTimeout(checkOverduePOs, 1000);
      return () => clearTimeout(timer);
  }, [purchaseOrders]); 

  const addNotification = (title: string, message: string, type: AppNotification['type'], link?: string) => {
      const newNotification: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          title, message, type, timestamp: new Date().toISOString(), read: false, link
      };
      setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  // --- Location Management ---
  const addLocation = (location: Location) => {
      setLocations(prev => [...prev, location]);
      addActivity(`New Location added: ${location.name}`, 'system');
  };
  const updateLocation = (location: Location) => setLocations(prev => prev.map(l => l.id === location.id ? location : l));
  const deleteLocation = (id: string) => {
      setLocations(prev => prev.filter(l => l.id !== id));
      setLocationStocks(prev => prev.filter(ls => ls.locationId !== id)); // Cleanup stocks
  };

  const transferStock = (productId: string, fromLocationId: string, toLocationId: string, quantity: number, reason: string) => {
      const fromStock = locationStocks.find(ls => ls.productId === productId && ls.locationId === fromLocationId);
      
      if (!fromStock || fromStock.quantity < quantity) {
          addNotification('Transfer Failed', `Insufficient stock in source location.`, 'alert');
          return;
      }

      const product = products.find(p => p.id === productId);
      const fromLoc = locations.find(l => l.id === fromLocationId);
      const toLoc = locations.find(l => l.id === toLocationId);

      setLocationStocks(prev => {
          const next = [...prev];
          
          // Deduct from source
          const fromIndex = next.findIndex(ls => ls.productId === productId && ls.locationId === fromLocationId);
          next[fromIndex] = { ...next[fromIndex], quantity: next[fromIndex].quantity - quantity };

          // Add to dest
          const toIndex = next.findIndex(ls => ls.productId === productId && ls.locationId === toLocationId);
          if (toIndex > -1) {
              next[toIndex] = { ...next[toIndex], quantity: next[toIndex].quantity + quantity };
          } else {
              next.push({ productId, locationId: toLocationId, quantity });
          }
          return next;
      });

      addActivity(`Transferred ${quantity} ${product?.name} from ${fromLoc?.name} to ${toLoc?.name}`, 'transfer');
      addNotification('Stock Transfer', `Successfully transferred ${quantity} units.`, 'success');
  };

  // --- Product & Stock Management ---

  const addProduct = (product: Product) => {
    const productWithDate = {
        ...product,
        cost: product.cost || Number((product.price * 0.6).toFixed(2)),
        lastRestockDate: product.lastRestockDate || new Date().toISOString().split('T')[0]
    };
    setProducts(prev => [productWithDate, ...prev]);
    
    // Add initial stock to first warehouse if exists
    if (product.stock > 0 && locations.length > 0) {
        setLocationStocks(prev => [...prev, {
            productId: product.id,
            locationId: locations[0].id,
            quantity: product.stock
        }]);
    }

    addActivity(`Product added: ${product.name}`, 'stock');
    addNotification('New Product', `${product.name} added to inventory.`, 'success', '/products');
  };

  const updateProduct = (product: Product) => setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  const deleteProduct = (id: string) => {
      setProducts(prev => prev.filter(p => p.id !== id));
      setLocationStocks(prev => prev.filter(ls => ls.productId !== id));
  };

  const writeOffProduct = (productId: string, quantity: number, reason: string) => {
    // Determine which location to write off from (simple logic: take from largest stock pile)
    let remainingToWriteOff = quantity;
    
    setLocationStocks(prev => {
        const productStocks = prev.filter(ls => ls.productId === productId).sort((a, b) => b.quantity - a.quantity);
        const next = [...prev];

        for (const stockEntry of productStocks) {
            if (remainingToWriteOff <= 0) break;
            
            const idx = next.findIndex(ls => ls.locationId === stockEntry.locationId && ls.productId === productId);
            if (idx > -1) {
                const deduct = Math.min(next[idx].quantity, remainingToWriteOff);
                next[idx] = { ...next[idx], quantity: next[idx].quantity - deduct };
                remainingToWriteOff -= deduct;
            }
        }
        return next;
    });

    setProducts(prev => prev.map(p => {
        if (p.id === productId) {
            const newStock = Math.max(0, p.stock - quantity);
            let newStatus: Product['status'] = 'In Stock';
            if (newStock === 0) newStatus = 'Out of Stock';
            else if (newStock <= p.reorderLevel) newStatus = 'Low Stock';

            if (newStock <= p.reorderLevel) {
                 addNotification('Low Stock Alert', `${p.name} stock (${newStock}) dropped below reorder level.`, 'alert', '/products');
            }
            return { ...p, stock: newStock, status: newStatus };
        }
        return p;
    }));
    
    const pName = products.find(p => p.id === productId)?.name || 'Unknown';
    addActivity(`Write-off: ${quantity} units of ${pName}. Reason: ${reason}`, 'stock');
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
    
    // Decrease stock for ordered items
    const updatedProducts = [...products];
    const updatedLocationStocks = [...locationStocks];

    order.items.forEach(item => {
      const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (productIndex > -1) {
        const product = updatedProducts[productIndex];
        const newStock = Math.max(0, product.stock - item.quantity);
        
        // Smart Deduct from Locations
        let remainingToDeduct = item.quantity;
        // Find stocks for this product, prioritize warehouses with most stock
        const relevantStocks = updatedLocationStocks
            .map((ls, idx) => ({ ...ls, idx }))
            .filter(ls => ls.productId === item.productId)
            .sort((a, b) => b.quantity - a.quantity);

        for (const locStock of relevantStocks) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(locStock.quantity, remainingToDeduct);
            updatedLocationStocks[locStock.idx].quantity -= deduct;
            remainingToDeduct -= deduct;
        }

        let newStatus: Product['status'] = 'In Stock';
        if (newStock === 0) newStatus = 'Out of Stock';
        else if (newStock <= product.reorderLevel) newStatus = 'Low Stock';

        if (newStock <= product.reorderLevel && product.stock > product.reorderLevel) {
            addNotification('Low Stock Warning', `${product.name} is now low on stock (${newStock} remaining).`, 'alert', '/products');
        }

        updatedProducts[productIndex] = { ...product, stock: newStock, status: newStatus };
      }
    });

    setProducts(updatedProducts);
    setLocationStocks(updatedLocationStocks);
    addActivity(`New Order #${order.id} received`, 'order');
  };

  const addSupplier = (supplier: Supplier) => { setSuppliers(prev => [supplier, ...prev]); addActivity(`New Supplier added: ${supplier.name}`, 'system'); };
  const updateSupplier = (supplier: Supplier) => setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
  const deleteSupplier = (id: string) => setSuppliers(prev => prev.filter(s => s.id !== id));

  const addPurchaseOrder = (po: PurchaseOrder) => {
      setPurchaseOrders(prev => [po, ...prev]);
      addActivity(`New Purchase Order #${po.id} to ${po.supplierName}`, 'stock');
      addNotification('PO Created', `Purchase Order #${po.id} created for ${po.supplierName}.`, 'info', '/purchase-orders');
  };

  const receivePurchaseOrder = (id: string) => {
      const po = purchaseOrders.find(p => p.id === id);
      if (!po || po.status === 'Received') return;

      const today = new Date().toISOString().split('T')[0];

      setPurchaseOrders(prev => prev.map(p => p.id === id ? { ...p, status: 'Received', receivedDate: today } : p));

      const updatedLocationStocks = [...locationStocks];
      // Default receive location: First Warehouse found
      const defaultLocId = locations.find(l => l.type === 'Warehouse')?.id || locations[0]?.id;

      setProducts(prevProducts => {
         const newProducts = [...prevProducts];
         po.items.forEach(item => {
             const idx = newProducts.findIndex(p => p.id === item.productId);
             if (idx > -1) {
                 const product = newProducts[idx];
                 const newStock = product.stock + item.quantity;
                 
                 // Update Location Stock
                 if (defaultLocId) {
                     const lsIdx = updatedLocationStocks.findIndex(ls => ls.productId === item.productId && ls.locationId === defaultLocId);
                     if (lsIdx > -1) {
                         updatedLocationStocks[lsIdx].quantity += item.quantity;
                     } else {
                         updatedLocationStocks.push({ productId: item.productId, locationId: defaultLocId, quantity: item.quantity });
                     }
                 }

                 let newStatus: Product['status'] = 'In Stock';
                 if (newStock === 0) newStatus = 'Out of Stock';
                 else if (newStock <= product.reorderLevel) newStatus = 'Low Stock';
                 
                 newProducts[idx] = { ...product, stock: newStock, status: newStatus, lastRestockDate: today };
             }
         });
         return newProducts;
      });
      
      setLocationStocks(updatedLocationStocks);
      addActivity(`Received Purchase Order #${po.id} from ${po.supplierName}`, 'stock');
      addNotification('Stock Received', `Inventory updated from PO #${po.id}.`, 'success', '/purchase-orders');
  };

  const addTask = (task: Task) => { setTasks(prev => [task, ...prev]); addActivity(`New task assigned: ${task.title}`, 'system'); };
  const updateTask = (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const addReturn = (returnData: Return) => {
      setReturns(prev => [returnData, ...prev]);
      const updatedProducts = [...products];
      const updatedLocationStocks = [...locationStocks];
      const defaultLocId = locations[0]?.id;
      let stockUpdated = false;

      returnData.items.forEach(item => {
          if (item.action === 'Restock') {
              const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
              if (productIndex > -1) {
                  const product = updatedProducts[productIndex];
                  const newStock = product.stock + item.quantity;
                  
                  if (defaultLocId) {
                      const lsIdx = updatedLocationStocks.findIndex(ls => ls.productId === item.productId && ls.locationId === defaultLocId);
                      if (lsIdx > -1) updatedLocationStocks[lsIdx].quantity += item.quantity;
                      else updatedLocationStocks.push({ productId: item.productId, locationId: defaultLocId, quantity: item.quantity });
                  }

                  let newStatus: Product['status'] = 'In Stock';
                  if (newStock === 0) newStatus = 'Out of Stock';
                  else if (newStock <= product.reorderLevel) newStatus = 'Low Stock';

                  updatedProducts[productIndex] = { ...product, stock: newStock, status: newStatus };
                  stockUpdated = true;
              }
          }
      });

      if (stockUpdated) {
          setProducts(updatedProducts);
          setLocationStocks(updatedLocationStocks);
      }
      addActivity(`Return processed for Order #${returnData.orderId}`, 'return');
  };

  const addActivity = (message: string, type: Activity['type']) => {
    setActivities(prev => [{ id: Math.random().toString(36).substr(2, 9), message, type, timestamp: 'Just now' }, ...prev]);
  };
  const refreshActivities = () => {};

  return (
    <DataContext.Provider value={{
      products, orders, suppliers, activities, tasks, returns, purchaseOrders, notifications, locations, locationStocks,
      addProduct, updateProduct, deleteProduct, writeOffProduct,
      addOrder,
      addSupplier, updateSupplier, deleteSupplier,
      addPurchaseOrder, receivePurchaseOrder,
      addTask, updateTask, deleteTask,
      addReturn,
      addNotification, markNotificationRead, markAllNotificationsRead, deleteNotification,
      addLocation, updateLocation, deleteLocation, transferStock,
      refreshActivities,
      isCopilotOpen, toggleCopilot
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
