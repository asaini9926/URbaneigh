/**
 * Order State Transition Guard
 * 
 * Enforces valid state transitions for Order.status
 * Prevents invalid state changes that violate business logic
 * 
 * Core Principle: Order only tracks PAYMENT READINESS
 * Shipment tracks DELIVERY, Return tracks RETURN PROCESSING
 */

/**
 * Defines valid state transitions for Order.status
 * Based on business logic and domain boundaries
 */
const VALID_TRANSITIONS = {
  // Initial state
  'CREATED': ['PAYMENT_PENDING', 'CANCELLED'],
  
  // Payment processing
  'PAYMENT_PENDING': ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  'PAYMENT_FAILED': ['CANCELLED'],  // Can only cancel failed orders
  
  // Order confirmed, ready for fulfillment
  'PAID': ['READY_TO_PACK', 'CANCELLED'],
  
  // Warehouse processing
  'READY_TO_PACK': ['PACKED'],
  
  // Ready for courier handoff (terminal before cancellation blocked)
  'PACKED': ['CANCELLED'],  // Can only cancel before courier takes it
  
  // Terminal states - no transitions out
  'CANCELLED': []
};

/**
 * Validates if a state transition is allowed
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired status
 * @returns {boolean} True if transition is valid
 */
function canTransition(fromStatus, toStatus) {
  // Allow idempotent updates (same status)
  if (fromStatus === toStatus) return true;
  
  const allowedTransitions = VALID_TRANSITIONS[fromStatus];
  if (!allowedTransitions) {
    return false; // Unknown status
  }
  
  return allowedTransitions.includes(toStatus);
}

/**
 * Throws error if transition is invalid
 * Use this in controllers to validate before updating status
 * 
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired status
 * @throws {Error} If transition is not allowed
 * 
 * @example
 * try {
 *   validateTransition(order.status, 'PAID');
 *   await updateOrderStatus(orderId, 'PAID');
 * } catch (error) {
 *   res.status(400).json({ error: error.message });
 * }
 */
function validateTransition(fromStatus, toStatus) {
  // Allow idempotent updates
  if (fromStatus === toStatus) return;
  
  if (!canTransition(fromStatus, toStatus)) {
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)';
    
    throw new Error(
      `Invalid order status transition: ${fromStatus} → ${toStatus}. ` +
      `Allowed transitions from ${fromStatus}: ${allowedStr}`
    );
  }
}

/**
 * Gets all valid next states from current state
 * Useful for UI to show available actions
 * 
 * @param {string} status - Current order status
 * @returns {string[]} Array of valid next statuses
 */
function getValidNextStates(status) {
  return VALID_TRANSITIONS[status] || [];
}

/**
 * Checks if an order can be cancelled from its current state
 * 
 * @param {string} status - Current order status
 * @returns {boolean} True if order can be cancelled
 */
function canBeCancelled(status) {
  return getValidNextStates(status).includes('CANCELLED');
}

/**
 * Checks if an order can proceed to payment
 * 
 * @param {string} status - Current order status
 * @returns {boolean} True if order is in state where payment can be initiated
 */
function canInitiatePayment(status) {
  return status === 'CREATED';
}

/**
 * Checks if an order is fully paid and ready for warehouse
 * 
 * @param {string} status - Current order status
 * @returns {boolean} True if order is paid and ready for fulfillment
 */
function isReadyForFulfillment(status) {
  return status === 'PAID';
}

/**
 * Checks if an order is in a terminal state
 * (no more transitions possible)
 * 
 * @param {string} status - Current order status
 * @returns {boolean} True if status is terminal
 */
function isTerminalState(status) {
  return VALID_TRANSITIONS[status]?.length === 0;
}

module.exports = {
  VALID_TRANSITIONS,
  canTransition,
  validateTransition,
  getValidNextStates,
  canBeCancelled,
  canInitiatePayment,
  isReadyForFulfillment,
  isTerminalState
};
