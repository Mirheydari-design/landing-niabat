export interface OrderItem {
  id: string; // entry_id (e.g. ord_...)
  name: string;
  phone: string;
  amal: string;
  niyyat?: string;
  amount: number; // in Toman
  status: 'pending' | 'paid' | 'failed' | 'amount_mismatch';
  paymentRef?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface AppStats {
  totalViews: number;
  uniqueViews: number;
  totalOrders: number;
  totalPaidOrders: number;
  totalPaidAmount: number;
  conversionRate: number;
}

export interface DonationCardInfo {
  hasCard: boolean;
  cardNumber: string | null;
  cardHolder: string | null;
}
