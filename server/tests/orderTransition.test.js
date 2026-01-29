/**
 * Order Transition Guard Tests
 * 
 * Tests to verify Order.status transitions are properly enforced
 */

const {
  VALID_TRANSITIONS,
  canTransition,
  validateTransition,
  getValidNextStates,
  canBeCancelled,
  canInitiatePayment,
  isReadyForFulfillment,
  isTerminalState
} = require('../utils/orderTransitionGuard');

/**
 * Test: Valid transitions
 */
function testValidTransitions() {
  console.log('\n✅ Testing VALID transitions:');

  const validTests = [
    { from: 'CREATED', to: 'PAYMENT_PENDING' },
    { from: 'PAYMENT_PENDING', to: 'PAID' },
    { from: 'PAID', to: 'READY_TO_PACK' },
    { from: 'READY_TO_PACK', to: 'PACKED' },
    { from: 'CREATED', to: 'CANCELLED' },
    { from: 'PAYMENT_PENDING', to: 'CANCELLED' },
    { from: 'PAID', to: 'CANCELLED' },
    { from: 'PACKED', to: 'CANCELLED' }
  ];

  validTests.forEach(({ from, to }) => {
    const result = canTransition(from, to);
    console.log(`  ${result ? '✓' : '✗'} ${from} → ${to}: ${result}`);
    if (!result) throw new Error(`Expected valid transition: ${from} → ${to}`);
  });
}

/**
 * Test: Invalid transitions
 */
function testInvalidTransitions() {
  console.log('\n❌ Testing INVALID transitions (should fail):');

  const invalidTests = [
    { from: 'CREATED', to: 'PACKED' },
    { from: 'CREATED', to: 'DELIVERED' },
    { from: 'PAID', to: 'PAYMENT_PENDING' },  // Backwards
    { from: 'CANCELLED', to: 'PAID' },        // Terminal state
    { from: 'READY_TO_PACK', to: 'CANCELLED' },  // Can't cancel after READY_TO_PACK
    { from: 'IN_TRANSIT', to: 'DELIVERED' },  // Invalid state doesn't exist
  ];

  invalidTests.forEach(({ from, to }) => {
    const result = canTransition(from, to);
    console.log(`  ${!result ? '✓' : '✗'} ${from} → ${to}: ${!result} (should be false)`);
    if (result) throw new Error(`Expected invalid transition: ${from} → ${to}`);
  });
}

/**
 * Test: Idempotent updates (same status)
 */
function testIdempotentUpdates() {
  console.log('\n♻️  Testing idempotent updates (same status):');

  const statuses = Object.keys(VALID_TRANSITIONS);
  statuses.forEach(status => {
    const result = canTransition(status, status);
    console.log(`  ${result ? '✓' : '✗'} ${status} → ${status}: ${result}`);
    if (!result) throw new Error(`Idempotent update should be allowed: ${status} → ${status}`);
  });
}

/**
 * Test: validateTransition throws on invalid
 */
function testValidateTransitionThrows() {
  console.log('\n🚨 Testing validateTransition error handling:');

  const invalidCases = [
    { from: 'CREATED', to: 'DELIVERED' },
    { from: 'CANCELLED', to: 'PAID' }
  ];

  invalidCases.forEach(({ from, to }) => {
    try {
      validateTransition(from, to);
      console.log(`  ✗ Should have thrown for ${from} → ${to}`);
      throw new Error(`Should have thrown for invalid transition: ${from} → ${to}`);
    } catch (error) {
      if (error.message.includes('Invalid order status transition')) {
        console.log(`  ✓ Correctly threw error for ${from} → ${to}`);
      } else {
        throw error;
      }
    }
  });
}

/**
 * Test: getValidNextStates
 */
function testGetValidNextStates() {
  console.log('\n📋 Testing getValidNextStates:');

  const tests = [
    { status: 'CREATED', expected: ['PAYMENT_PENDING', 'CANCELLED'] },
    { status: 'PAYMENT_PENDING', expected: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'] },
    { status: 'PAID', expected: ['READY_TO_PACK', 'CANCELLED'] },
    { status: 'READY_TO_PACK', expected: ['PACKED'] },
    { status: 'PACKED', expected: ['CANCELLED'] },
    { status: 'CANCELLED', expected: [] }
  ];

  tests.forEach(({ status, expected }) => {
    const result = getValidNextStates(status);
    const isCorrect = JSON.stringify(result) === JSON.stringify(expected);
    console.log(`  ${isCorrect ? '✓' : '✗'} ${status}: [${result.join(', ')}]`);
    if (!isCorrect) {
      throw new Error(`Expected ${expected.join(', ')} but got ${result.join(', ')}`);
    }
  });
}

/**
 * Test: canBeCancelled
 */
function testCanBeCancelled() {
  console.log('\n🚫 Testing canBeCancelled:');

  const tests = [
    { status: 'CREATED', expected: true },
    { status: 'PAYMENT_PENDING', expected: true },
    { status: 'PAID', expected: true },
    { status: 'READY_TO_PACK', expected: false },
    { status: 'PACKED', expected: true },
    { status: 'CANCELLED', expected: false }
  ];

  tests.forEach(({ status, expected }) => {
    const result = canBeCancelled(status);
    console.log(`  ${result === expected ? '✓' : '✗'} ${status}: ${result} (expected ${expected})`);
    if (result !== expected) {
      throw new Error(`canBeCancelled(${status}) should be ${expected} but got ${result}`);
    }
  });
}

/**
 * Test: canInitiatePayment
 */
function testCanInitiatePayment() {
  console.log('\n💳 Testing canInitiatePayment:');

  const tests = [
    { status: 'CREATED', expected: true },
    { status: 'PAYMENT_PENDING', expected: false },
    { status: 'PAID', expected: false },
    { status: 'CANCELLED', expected: false }
  ];

  tests.forEach(({ status, expected }) => {
    const result = canInitiatePayment(status);
    console.log(`  ${result === expected ? '✓' : '✗'} ${status}: ${result}`);
    if (result !== expected) {
      throw new Error(`canInitiatePayment(${status}) should be ${expected}`);
    }
  });
}

/**
 * Test: isReadyForFulfillment
 */
function testIsReadyForFulfillment() {
  console.log('\n📦 Testing isReadyForFulfillment:');

  const tests = [
    { status: 'CREATED', expected: false },
    { status: 'PAYMENT_PENDING', expected: false },
    { status: 'PAID', expected: true },
    { status: 'READY_TO_PACK', expected: false },
    { status: 'CANCELLED', expected: false }
  ];

  tests.forEach(({ status, expected }) => {
    const result = isReadyForFulfillment(status);
    console.log(`  ${result === expected ? '✓' : '✗'} ${status}: ${result}`);
    if (result !== expected) {
      throw new Error(`isReadyForFulfillment(${status}) should be ${expected}`);
    }
  });
}

/**
 * Test: isTerminalState
 */
function testIsTerminalState() {
  console.log('\n⏹️  Testing isTerminalState:');

  const tests = [
    { status: 'CREATED', expected: false },
    { status: 'PAID', expected: false },
    { status: 'PACKED', expected: false },
    { status: 'CANCELLED', expected: true }
  ];

  tests.forEach(({ status, expected }) => {
    const result = isTerminalState(status);
    console.log(`  ${result === expected ? '✓' : '✗'} ${status}: ${result}`);
    if (result !== expected) {
      throw new Error(`isTerminalState(${status}) should be ${expected}`);
    }
  });
}

/**
 * Test: Full order lifecycle
 */
function testFullOrderLifecycle() {
  console.log('\n🔄 Testing FULL ORDER LIFECYCLE:');

  const flow = [
    'CREATED',
    'PAYMENT_PENDING',
    'PAID',
    'READY_TO_PACK',
    'PACKED',
    'CANCELLED'
  ];

  console.log('  Testing sequence: ' + flow.join(' → '));
  for (let i = 0; i < flow.length - 1; i++) {
    const from = flow[i];
    const to = flow[i + 1];
    const valid = canTransition(from, to);
    console.log(`    ${valid ? '✓' : '✗'} ${from} → ${to}`);
    if (!valid) throw new Error(`Valid flow broken: ${from} → ${to}`);
  }
  console.log('  ✓ Complete lifecycle is valid');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('='.repeat(60));
  console.log('ORDER TRANSITION GUARD - TEST SUITE');
  console.log('='.repeat(60));

  try {
    testValidTransitions();
    testInvalidTransitions();
    testIdempotentUpdates();
    testValidateTransitionThrows();
    testGetValidNextStates();
    testCanBeCancelled();
    testCanInitiatePayment();
    testIsReadyForFulfillment();
    testIsTerminalState();
    testFullOrderLifecycle();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    process.exit(0);

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED!');
    console.log('='.repeat(60));
    console.error('\nError:', error.message);
    console.log('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
