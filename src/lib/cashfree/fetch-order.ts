import { buildCashfreeHeaders, getCashfreeBaseUrl } from "@/lib/cashfree/config";

export type CashfreeOrderStatus =
  "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";

export type CashfreeOrderEntity = {
  order_id: string;
  order_status: CashfreeOrderStatus | string;
};

export type CashfreePaymentEntity = {
  payment_status?: string;
};

export const fetchCashfreeOrder = async (orderId: string): Promise<CashfreeOrderEntity | null> => {
  const baseUrl = getCashfreeBaseUrl();
  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: buildCashfreeHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cashfree order fetch failed (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as CashfreeOrderEntity;
};

export const fetchCashfreePaymentsForOrder = async (
  orderId: string,
): Promise<CashfreePaymentEntity[]> => {
  const baseUrl = getCashfreeBaseUrl();
  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
    method: "GET",
    headers: buildCashfreeHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cashfree payments fetch failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as CashfreePaymentEntity[];
  return Array.isArray(data) ? data : [];
};

export const hasSuccessfulCashfreePayment = (payments: CashfreePaymentEntity[]): boolean =>
  payments.some((payment) => payment.payment_status?.toUpperCase() === "SUCCESS");

export const hasTerminalFailedCashfreePayment = (payments: CashfreePaymentEntity[]): boolean =>
  payments.some((payment) => {
    const status = payment.payment_status?.toUpperCase() ?? "";
    return status === "FAILED" || status === "USER_DROPPED" || status === "CANCELLED";
  });

export const isCashfreeOrderPaid = (order: CashfreeOrderEntity): boolean =>
  order.order_status?.toUpperCase() === "PAID";

export const isCashfreeOrderTerminalFailure = (order: CashfreeOrderEntity): boolean => {
  const status = order.order_status?.toUpperCase() ?? "";
  return status === "EXPIRED" || status === "TERMINATED";
};
