
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number; // Added cost field
  stock: number;
  reorderLevel: number;
  supplier: string;
  supplierContact?: string;
  supplierEmail?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastRestockDate?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: OrderItem[];
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string; // Date ordered
  expectedDeliveryDate: string;
  receivedDate?: string;
  status: 'Pending' | 'Received' | 'Delayed';
  totalCost: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }[];
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
}

export interface Activity {
  id: string;
  type: 'order' | 'stock' | 'system' | 'alert' | 'return' | 'transfer';
  message: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
}

export enum KPIType {
  REVENUE = 'revenue',
  ORDERS = 'orders',
  PRODUCTS = 'products',
  ALERTS = 'alerts'
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  reason: 'Damaged' | 'Wrong Item' | 'No Longer Needed' | 'Defective';
  condition: 'New' | 'Opened' | 'Damaged';
  action: 'Restock' | 'Discard';
  refundAmount: number;
}

export interface Return {
  id: string;
  orderId: string;
  customer: string;
  date: string;
  status: 'Pending' | 'Processed' | 'Rejected';
  totalRefund: number;
  items: ReturnItem[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  type: 'Warehouse' | 'Store';
  capacity?: number;
}

export interface LocationStock {
  productId: string;
  locationId: string;
  quantity: number;
}
