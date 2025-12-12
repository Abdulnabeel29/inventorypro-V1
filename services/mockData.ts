
import { Product, Order, Supplier, Activity, Task, Return, PurchaseOrder, AppNotification, Location, LocationStock } from '../types';

export const mockProducts: Product[] = [
  { id: '1', name: 'Wireless Headphones', sku: 'WH-001', category: 'Electronics', price: 129.99, cost: 85.00, stock: 45, reorderLevel: 20, supplier: 'TechSounds Inc.', status: 'In Stock', lastRestockDate: '2023-09-15' },
  { id: '2', name: 'Ergonomic Office Chair', sku: 'EC-202', category: 'Furniture', price: 259.50, cost: 150.00, stock: 8, reorderLevel: 10, supplier: 'ComfySeating', status: 'Low Stock', lastRestockDate: '2023-08-01' },
  { id: '3', name: 'Mechanical Keyboard', sku: 'MK-104', category: 'Electronics', price: 89.99, cost: 45.00, stock: 120, reorderLevel: 30, supplier: 'KeyMasters', status: 'In Stock', lastRestockDate: '2023-10-10' },
  { id: '4', name: 'USB-C Docking Station', sku: 'UD-555', category: 'Accessories', price: 149.00, cost: 90.00, stock: 2, reorderLevel: 15, supplier: 'Connex', status: 'Low Stock', lastRestockDate: '2023-06-15' },
  { id: '5', name: '27-inch 4K Monitor', sku: 'MN-400', category: 'Electronics', price: 399.99, cost: 280.00, stock: 0, reorderLevel: 5, supplier: 'Visionary', status: 'Out of Stock', lastRestockDate: '2023-05-20' },
  { id: '6', name: 'Standing Desk Frame', sku: 'SD-101', category: 'Furniture', price: 350.00, cost: 210.00, stock: 25, reorderLevel: 10, supplier: 'ComfySeating', status: 'In Stock', lastRestockDate: '2023-01-10' }, 
  { id: '7', name: 'Webcam 1080p', sku: 'WC-720', category: 'Accessories', price: 49.99, cost: 25.00, stock: 200, reorderLevel: 50, supplier: 'Visionary', status: 'In Stock', lastRestockDate: '2023-10-01' },
];

export const mockLocations: Location[] = [
    { id: 'L1', name: 'Main Warehouse', address: '123 Logistics Way, Industrial Park', type: 'Warehouse' },
    { id: 'L2', name: 'Downtown Store', address: '456 Retail Blvd, City Center', type: 'Store' },
    { id: 'L3', name: 'Westside Depot', address: '789 West Ave, Suburbia', type: 'Warehouse' },
];

// Distribute initial stock across locations
export const mockLocationStocks: LocationStock[] = [
    // Wireless Headphones (45 total)
    { productId: '1', locationId: 'L1', quantity: 30 },
    { productId: '1', locationId: 'L2', quantity: 15 },
    // Office Chair (8 total)
    { productId: '2', locationId: 'L1', quantity: 8 },
    // Keyboard (120 total)
    { productId: '3', locationId: 'L1', quantity: 100 },
    { productId: '3', locationId: 'L2', quantity: 20 },
    // Docking Station (2 total)
    { productId: '4', locationId: 'L2', quantity: 2 },
    // Standing Desk (25 total)
    { productId: '6', locationId: 'L1', quantity: 20 },
    { productId: '6', locationId: 'L3', quantity: 5 },
    // Webcam (200 total)
    { productId: '7', locationId: 'L1', quantity: 150 },
    { productId: '7', locationId: 'L2', quantity: 50 },
];

// Generate orders for the last 6 months for better analytics
const generateHistoricalOrders = (): Order[] => {
  const orders: Order[] = [];
  const today = new Date();
  const customers = ['Acme Corp', 'Global Tech', 'Startup Hub', 'Design Studio', 'Freelancer John', 'Cyberdyne', 'Massive Dynamic'];
  
  // Go back 180 days
  for (let i = 0; i < 150; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 180));
    
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;

    for (let j = 0; j < numItems; j++) {
      const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      const qty = Math.floor(Math.random() * 5) + 1;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        price: product.price
      });
      total += qty * product.price;
    }

    orders.push({
      id: `ORD-${1000 + i}`,
      customer: customers[Math.floor(Math.random() * customers.length)],
      date: date.toISOString().split('T')[0],
      total: Number(total.toFixed(2)),
      status: Math.random() > 0.2 ? 'Delivered' : 'Pending',
      items
    });
  }
  return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const mockOrders: Order[] = generateHistoricalOrders();

export const mockSuppliers: Supplier[] = [
  { id: '1', name: 'TechSounds Inc.', contact: 'Alice Smith', email: 'alice@techsounds.com' },
  { id: '2', name: 'ComfySeating', contact: 'Bob Jones', email: 'sales@comfyseating.com' },
  { id: '3', name: 'Visionary', contact: 'Carol Danvers', email: 'support@visionary.com' },
  { id: '4', name: 'KeyMasters', contact: 'Dave Click', email: 'dave@keymasters.io' },
  { id: '5', name: 'Connex', contact: 'Eve Wire', email: 'eve@connex.net' },
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  // TechSounds Inc. (ID 1)
  {
    id: 'PO-101', supplierId: '1', supplierName: 'TechSounds Inc.', date: '2023-09-01', expectedDeliveryDate: '2023-09-10', receivedDate: '2023-09-15', status: 'Received', totalCost: 2000,
    items: [{ productId: '1', productName: 'Wireless Headphones', quantity: 20, unitCost: 100 }]
  }, 
  {
    id: 'PO-102', supplierId: '1', supplierName: 'TechSounds Inc.', date: '2023-08-01', expectedDeliveryDate: '2023-08-07', receivedDate: '2023-08-05', status: 'Received', totalCost: 1500,
    items: [{ productId: '1', productName: 'Wireless Headphones', quantity: 15, unitCost: 100 }]
  },

  // ComfySeating (ID 2)
  {
    id: 'PO-201', supplierId: '2', supplierName: 'ComfySeating', date: '2023-07-15', expectedDeliveryDate: '2023-07-25', receivedDate: '2023-07-25', status: 'Received', totalCost: 5000,
    items: [{ productId: '2', productName: 'Ergonomic Office Chair', quantity: 25, unitCost: 200 }]
  }, 
  {
    id: 'PO-202', supplierId: '2', supplierName: 'ComfySeating', date: '2023-09-01', expectedDeliveryDate: '2023-09-15', receivedDate: '2023-09-12', status: 'Received', totalCost: 3000,
    items: [{ productId: '6', productName: 'Standing Desk Frame', quantity: 15, unitCost: 200 }]
  }, 

  // Visionary (ID 3)
  {
    id: 'PO-301', supplierId: '3', supplierName: 'Visionary', date: '2023-09-20', expectedDeliveryDate: '2023-09-25', receivedDate: '2023-09-28', status: 'Received', totalCost: 4500,
    items: [{ productId: '5', productName: '27-inch 4K Monitor', quantity: 15, unitCost: 300 }]
  }, 
  
  // KeyMasters (ID 4)
  {
    id: 'PO-401', supplierId: '4', supplierName: 'KeyMasters', date: '2023-10-01', expectedDeliveryDate: '2023-10-05', receivedDate: '2023-10-10', status: 'Received', totalCost: 1200,
    items: [{ productId: '3', productName: 'Mechanical Keyboard', quantity: 20, unitCost: 60 }]
  } 
];

export const mockActivities: Activity[] = [
  { id: '1', type: 'order', message: 'New order #ORD-006 from Cyberdyne', timestamp: '10 min ago' },
  { id: '2', type: 'alert', message: 'Low stock alert: USB-C Docking Station', timestamp: '1 hour ago' },
  { id: '3', type: 'stock', message: 'Restocked 50 units of Mechanical Keyboard', timestamp: '2 hours ago' },
  { id: '4', type: 'system', message: 'System maintenance scheduled for Sunday', timestamp: '5 hours ago' },
  { id: '5', type: 'order', message: 'Order #ORD-002 shipped to Global Tech', timestamp: '1 day ago' },
];

export const mockTasks: Task[] = [
  { id: '1', title: 'Review Q3 Inventory', description: 'Analyze stock levels and prepare report', assignee: 'Jane Doe', dueDate: '2023-11-15', priority: 'High', status: 'Pending' },
  { id: '2', title: 'Contact TechSounds Supplier', description: 'Negotiate better rates for headphones', assignee: 'John Smith', dueDate: '2023-11-10', priority: 'Medium', status: 'In Progress' },
  { id: '3', title: 'Update Safety Protocols', description: 'Warehouse safety guidelines update', assignee: 'Mike Johnson', dueDate: '2023-10-30', priority: 'Low', status: 'Completed' },
];

export const mockReturns: Return[] = [
  {
    id: 'RET-001',
    orderId: 'ORD-001',
    customer: 'Acme Corp',
    date: '2023-10-28',
    status: 'Processed',
    totalRefund: 129.99,
    items: [
      {
        productId: '1',
        productName: 'Wireless Headphones',
        quantity: 1,
        reason: 'Defective',
        condition: 'Opened',
        action: 'Discard',
        refundAmount: 129.99
      }
    ]
  }
];

export const mockNotifications: AppNotification[] = [
  {
    id: '1',
    title: 'Low Stock Alert',
    message: 'Wireless Headphones stock (45) is approaching reorder level (20).',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
    link: '/products'
  },
  {
    id: '2',
    title: 'New Order Received',
    message: 'Order #ORD-1049 from Cyberdyne requires processing.',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    link: '/orders'
  },
  {
    id: '3',
    title: 'System Update',
    message: 'InventoryPro was successfully updated to v2.0.',
    type: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true
  },
  {
    id: '4',
    title: 'Urgent: PO Overdue',
    message: 'PO #PO-102 from TechSounds Inc. is overdue by 3 days.',
    type: 'alert',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    read: false,
    link: '/purchase-orders'
  }
];
