/**
 * Tool functions callable by the agent graph.
 * These are stubs for demo purposes - wire them up to your real order/CRM
 * systems in production (e.g. Shopify API, internal DB, Zendesk, etc).
 */

async function checkOrderStatus(orderId) {
  // TODO: replace with a real order-management API call
  const mockStatuses = ["Processing", "Shipped", "Out for Delivery", "Delivered"];
  const status = mockStatuses[orderId ? orderId.length % mockStatuses.length : 0];
  return {
    orderId: orderId || "UNKNOWN",
    status,
    estimatedDelivery: "2-4 business days",
  };
}

async function getRefundPolicy() {
  return {
    policy:
      "Items can be returned within 30 days of delivery for a full refund, provided they are unused and in original packaging. Refunds are processed within 5-7 business days after we receive the returned item.",
  };
}

function createTicketDraft({ subject, priority = "medium", tags = [] }) {
  return { subject, priority, tags };
}

const tools = {
  check_order_status: checkOrderStatus,
  get_refund_policy: getRefundPolicy,
  create_ticket: createTicketDraft,
};

module.exports = { tools, checkOrderStatus, getRefundPolicy, createTicketDraft };
