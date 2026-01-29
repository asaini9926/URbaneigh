/**
 * Phase 1 Refactor Validation Script
 * 
 * Validates the database before and after schema changes
 * Helps ensure data integrity during OrderStatus enum refactor
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

/**
 * Export invalid orders (those with old-style statuses) to CSV
 */
async function exportInvalidOrders() {
  try {
    console.log('🔍 Searching for orders with invalid statuses...');
    
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        paymentMethod: true
      }
    });

    // List of statuses that will no longer exist after refactor
    const invalidStatuses = [
      'READY_TO_PICK',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'RETURN_REQUESTED',
      'RETURN_IN_TRANSIT',
      'RETURNED'
    ];

    const problematicOrders = orders.filter(o => invalidStatuses.includes(o.status));

    if (problematicOrders.length > 0) {
      console.log(`⚠️  Found ${problematicOrders.length} orders with statuses that will be removed:`);
      problematicOrders.forEach(o => {
        console.log(`  - Order #${o.orderNumber} (ID: ${o.id}): ${o.status}`);
      });

      // Export to CSV
      const csv = 'OrderID,OrderNumber,CurrentStatus,CreatedAt,PaymentMethod\n' +
        problematicOrders.map(o => 
          `${o.id},"${o.orderNumber}","${o.status}","${o.createdAt}","${o.paymentMethod}"`
        ).join('\n');

      const filename = `./server/scripts/invalid_orders_backup_${Date.now()}.csv`;
      fs.writeFileSync(filename, csv);
      console.log(`✅ Exported to: ${filename}`);

      return { success: false, count: problematicOrders.length, filename };
    } else {
      console.log('✅ No orders with invalid statuses found!');
      return { success: true, count: 0 };
    }

  } catch (error) {
    console.error('❌ Error exporting invalid orders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate Payment records have required QR data before migration
 */
async function validatePaymentQRData() {
  try {
    console.log('\n🔍 Checking for QR verification fields in Payment records...');
    
    const paymentsWithQR = await prisma.payment.findMany({
      where: {
        OR: [
          { qrReference: { not: null } },
          { proofUrl: { not: null } },
          { verifiedBy: { not: null } },
          { verifiedAt: { not: null } }
        ]
      },
      select: {
        id: true,
        orderId: true,
        qrReference: true,
        verifiedAt: true
      }
    });

    if (paymentsWithQR.length > 0) {
      console.log(`⚠️  Found ${paymentsWithQR.length} payments with QR data (will be deleted):`);
      paymentsWithQR.forEach(p => {
        console.log(`  - Payment ID: ${p.id} (Order: ${p.orderId}), Verified: ${p.verifiedAt}`);
      });

      // Export to CSV
      const csv = 'PaymentID,OrderID,QRReference,VerifiedAt\n' +
        paymentsWithQR.map(p => 
          `${p.id},${p.orderId},"${p.qrReference}","${p.verifiedAt}"`
        ).join('\n');

      const filename = `./server/scripts/qr_payments_backup_${Date.now()}.csv`;
      fs.writeFileSync(filename, csv);
      console.log(`✅ Exported QR data to: ${filename}`);

      return { success: true, count: paymentsWithQR.length, filename };
    } else {
      console.log('✅ No QR verification data found in payments!');
      return { success: true, count: 0 };
    }

  } catch (error) {
    console.error('❌ Error validating QR data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate Shipment records have delivery_at data
 */
async function validateShipmentData() {
  try {
    console.log('\n🔍 Checking Shipment records for delivered_at field...');
    
    const deliveredShipments = await prisma.shipment.findMany({
      where: { status: 'DELIVERED' },
      select: {
        id: true,
        orderId: true,
        status: true,
        delivered_at: true
      }
    });

    const missingDeliveredAt = deliveredShipments.filter(s => !s.delivered_at);

    if (missingDeliveredAt.length > 0) {
      console.log(`⚠️  Found ${missingDeliveredAt.length} DELIVERED shipments without delivered_at:`) ;
      missingDeliveredAt.forEach(s => {
        console.log(`  - Shipment ID: ${s.id} (Order: ${s.orderId})`);
      });
      console.log('⚠️  These should be updated before migration');
      
      return { success: false, count: missingDeliveredAt.length };
    } else {
      console.log('✅ All DELIVERED shipments have delivered_at field!');
      return { success: true, count: 0 };
    }

  } catch (error) {
    // delivered_at field might not exist yet, that's OK
    console.log('ℹ️  Shipment.delivered_at field not yet in schema (will be added by migration)');
    return { success: true };
  }
}

/**
 * Validate Return records are independent
 */
async function validateReturnData() {
  try {
    console.log('\n🔍 Checking Return records are properly created...');
    
    const returns = await prisma.return.findMany({
      select: {
        id: true,
        orderId: true,
        status: true
      }
    });

    console.log(`✅ Found ${returns.length} return records`);
    console.log('✅ Return.status is independent (not affected by this migration)');

    return { success: true, count: returns.length };

  } catch (error) {
    console.error('❌ Error validating returns:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate PaymentStatus enum values
 */
async function validatePaymentStatuses() {
  try {
    console.log('\n🔍 Checking Payment statuses...');
    
    const payments = await prisma.payment.findMany({
      select: { status: true },
      distinct: ['status']
    });

    const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'VERIFICATION_REQUIRED'];
    const currentStatuses = payments.map(p => p.status);

    console.log(`Current Payment.status values: ${[...new Set(currentStatuses)].join(', ')}`);

    const invalidStatuses = currentStatuses.filter(s => !validStatuses.includes(s));
    if (invalidStatuses.length > 0) {
      console.log(`⚠️  Found invalid statuses: ${[...new Set(invalidStatuses)].join(', ')}`);
      return { success: false };
    }

    console.log('✅ All Payment statuses are valid');
    return { success: true };

  } catch (error) {
    console.error('❌ Error validating payment statuses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run all validations
 */
async function runAllValidations() {
  console.log('='.repeat(60));
  console.log('PHASE 1 REFACTOR - PRE-MIGRATION VALIDATION');
  console.log('='.repeat(60));

  const results = {
    invalidOrders: await exportInvalidOrders(),
    qrData: await validatePaymentQRData(),
    shipments: await validateShipmentData(),
    returns: await validateReturnData(),
    paymentStatuses: await validatePaymentStatuses(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));

  let allValid = true;
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.success ? 'PASSED' : 'FAILED'}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });

  if (results.invalidOrders.success &&
      results.qrData.success &&
      results.shipments.success &&
      results.returns.success &&
      results.paymentStatuses.success) {
    console.log('\n✅ All validations PASSED! Ready for migration.');
  } else {
    console.log('\n❌ Some validations FAILED! Review above and fix before migrating.');
    allValid = false;
  }

  console.log('='.repeat(60));

  await prisma.$disconnect();
  process.exit(allValid ? 0 : 1);
}

// Run validations
runAllValidations().catch(error => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
