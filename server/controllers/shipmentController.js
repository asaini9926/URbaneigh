// server/controllers/shipmentController.js
const { PrismaClient } = require('@prisma/client');
const shiprocketService = require('../services/shiprocketService');
const prisma = new PrismaClient();

// Warehouse Info (stored in .env)
// Note: Shiprocket uses "Pickup Location ID" managed in dashboard, or uses default
// If we need to pass address, it's usually for the "Pickup Address" creation API.
const SELLER_NAME = process.env.SELLER_NAME || 'Urbaneigh';
const SELLER_PHONE = process.env.SELLER_PHONE || '';

// ============================================================================
// CHECK SERVICEABILITY (Prior to shipping)
// ============================================================================
exports.checkServiceability = async (req, res) => {
  try {
    const { pickupPincode, deliveryPincode, weight, cod } = req.body;
    
    // Default pickup pincode if not provided
    const pPincode = pickupPincode || process.env.STORE_PINCODE || '110001';
    
    const data = await shiprocketService.checkServiceability(
      pPincode, 
      deliveryPincode, 
      weight || 0.5, 
      cod ? 1 : 0
    );
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// CREATE SHIPMENT (Send order to Shiprocket, get AWB)
// ============================================================================
exports.createShipment = async (req, res) => {
  try {
    const { orderId, length, breadth, height, weight } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Fetch order with items and customer info
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        user: true,
        items: { include: { variant: { include: { product: true } } } },
        payment: true,
        shipments: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if shipment already exists
    if (order.shipments && order.shipments.length > 0) {
      return res.status(400).json({ error: 'Shipment already created for this order' });
    }

    // Order must be PAID to create shipment (Exceptions for COD managed by admin)
    // if (order.status !== 'PAID') { ... } // Strict check can be removed if Admin wants to force ship

    // Parse shipping address
    // Assuming shippingAddress is stored as JSON
    const address = order.shippingAddress; // { fullName, address, city, state, pincode, phone ... }

    // Prepare Order Items for Shiprocket
    const orderItems = order.items.map(item => ({
      name: item.variant.product.title,
      sku: item.variant.sku,
      units: item.quantity,
      selling_price: Number(item.price),
      discount: 0,
      tax: 0,
      hsn: 0 
    }));

    // Calculate details
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0] + ' ' + new Date(order.createdAt).toTimeString().split(' ')[0];
    
    const payload = {
      order_id: String(order.orderNumber),
      order_date: orderDate,
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
      channel_id: "", // Optional, use if integrated channel
      comment: "Reseller: Auto-Ship",
      billing_customer_name: order.user.name.split(' ')[0], // First Name
      billing_last_name: order.user.name.split(' ')[1] || "",
      billing_address: address.address || address.fullAddress,
      billing_city: address.city,
      billing_pincode: address.pincode,
      billing_state: address.state,
      billing_country: "India",
      billing_email: order.user.email,
      billing_phone: address.phone || order.user.phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.paymentMethod === 'COD' ? "COD" : "Prepaid",
      sub_total: Number(order.totalAmount),
      length: length || 10,
      breadth: breadth || 10,
      height: height || 10,
      weight: weight || 0.5 
    };

    // Call Shiprocket API
    const response = await shiprocketService.createOrder(payload);

    if (!response || !response.order_id) {
        throw new Error("Failed to create order on Shiprocket: " + JSON.stringify(response));
    }

    // Save Shipment to DB
    // Note: Shiprocket creates an "Order" first, then we assign AWB/Courier to make it a "Shipment"
    // Usually AWB is assigned automatically if "serviceability" is good or manual.
    // We will save the Shiprocket Order ID.
    
    // Auto-Assign AWB (Optional, or separate step. Usually createOrder just creates it)
    // If we want allow "Ship Now" to fully process, we should probably Assign AWB here or return ID for next step.
    // Let's store it as CREATED status.
    
    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        courier_provider: 'SHIPROCKET',
        status: 'CREATED',
        shiprocket_order_id: response.order_id,
        shiprocket_shipment_id: response.shipment_id,
        cod_amount: order.paymentMethod === 'COD' ? Number(order.totalAmount) : 0,
        delhivery_last_status_update: response // Storing full response for debug
      }
    });

    res.status(201).json({
      message: 'Shiprocket Order Created',
      shipment: shipment,
      shiprocket_response: response
    });

  } catch (error) {
    console.error('Shipment creation error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// GENERATE AWB / LABEL (After Order Creation)
// ============================================================================
// Usually Shiprocket Auto-Assigns AWB if enabled, or we call 'Generate AWB'
exports.generateAWB = async (req, res) => {
    try {
        const { shipmentId, courierId } = req.body; // Internal Shipment ID
        
        const shipment = await prisma.shipment.findUnique({ where: { id: parseInt(shipmentId) } });
        if(!shipment || !shipment.shiprocket_shipment_id) {
             return res.status(404).json({ error: "Valid Shiprocket shipment not found" });
        }

        // Generate AWB
        // If courierId is provided, we use it (Manual Selection)
        // Else, let Shiprocket assign best (Auto) - depends on their API but usually 'awb/assign' works
        const response = await shiprocketService.generateAWB(shipment.shiprocket_shipment_id);
        
        // Update DB with AWB
        const updated = await prisma.shipment.update({
            where: { id: shipment.id },
            data: {
                awb_code: response.awb_code,
                waybill: response.awb_code,
                courier_name: response.courier_name || "",
                status: 'MANIFESTED', // Ready for Pickup
                label_url: response.label_url // Sometimes returned here
            }
        });

        res.json({ message: "AWB Assigned", shipment: updated, response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================================================
// SCHEDULE PICKUP
// ============================================================================
exports.schedulePickup = async (req, res) => {
  try {
    const { shipmentIds } = req.body; // Internal IDs

    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({ error: 'Shipment IDs array is required' });
    }

    const shipments = await prisma.shipment.findMany({
      where: { id: { in: shipmentIds } }
    });
    
    // Filter for shiprocket shipments
    const srShipmentIds = shipments.map(s => s.shiprocket_shipment_id).filter(Boolean);

    if (srShipmentIds.length === 0) {
      return res.status(400).json({ error: 'No valid Shiprocket shipments found' });
    }

    const response = await shiprocketService.requestPickup(srShipmentIds);

    // Update status
    await prisma.shipment.updateMany({
        where: { id: { in: shipmentIds } },
        data: {
            status: 'PICKED_UP', // Or 'PICKUP_SCHEDULED'
            pickedUpAt: new Date() // Tentative
        }
    });

    res.json({ message: "Pickup Scheduled", response });

  } catch (error) {
    console.error('Pickup error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// GET TRACKING
// ============================================================================
exports.getTracking = async (req, res) => {
  try {
    const { waybill } = req.query;

    if (!waybill) {
      return res.status(400).json({ error: 'Waybill number is required' });
    }

    const data = await shiprocketService.trackShipment(waybill);
    res.json(data);

  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// SHIPROCKET WEBHOOK
// ============================================================================
exports.shiprocketWebhook = async (req, res) => {
  try {
    const data = req.body;
    
    // Validate Token (Shiprocket sends 'x-api-key' defined in settings, usually hard to validate without config)
    // We assume data integrity or check specific fields
    
    const awb = data.awb;
    const currentStatus = data.current_status; // e.g., "DELIVERED", "RTO INITIATED"
    
    if (!awb) return res.status(400).send("No AWB");

    const shipment = await prisma.shipment.findUnique({
        where: { waybill: awb },
        include: { order: true }
    });

    if (!shipment) return res.status(200).send("Shipment not found locally"); // 200 to ACK

    // Map Status
    let newStatus = shipment.status;
    let delivered = false;

    if (currentStatus === 'DELIVERED') {
        newStatus = 'DELIVERED';
        delivered = true;
    } else if (['RTO INITIATED', 'RTO DELIVERED'].includes(currentStatus)) {
        newStatus = 'FAILED'; // Or RETURN_INITIATED
    } else if (currentStatus === 'PICKED UP') {
        newStatus = 'PICKED_UP';
    } else if (currentStatus === 'IN TRANSIT') {
        newStatus = 'IN_TRANSIT';
    } else if (currentStatus === 'OUT FOR DELIVERY') {
        newStatus = 'OUT_FOR_DELIVERY';
    }

    const updateData = {
        status: newStatus,
        last_tracking_update: new Date(),
        delhivery_last_status_update: data // Store raw payload
    };
    
    if (delivered) updateData.delivered_at = new Date();

    await prisma.shipment.update({
        where: { id: shipment.id },
        data: updateData
    });
    
    // Auto-generate OTP logic for COD if Out For Delivery (Preserved from original)
    if (newStatus === 'OUT_FOR_DELIVERY' && shipment.order.paymentMethod === 'COD' && !shipment.order.payment?.cod_otp) {
        // ... (OTP generation logic)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.payment.update({
             where: { orderId: shipment.orderId },
             data: { cod_otp: otp, cod_attempts: 0 }
        });
    }
    
    // Mark Payment Completed if Delivered and COD
    if(newStatus === 'DELIVERED' && shipment.order.paymentMethod === 'COD') {
        await prisma.payment.update({
             where: { orderId: shipment.orderId },
             data: { status: 'COMPLETED' }
        });
    }

    res.status(200).send("Webhook Processed");

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// LIST SHIPMENTS
// ============================================================================
exports.listShipments = async (req, res) => {
  try {
    const { status, orderId } = req.query;

    let whereClause = {};
    if (status) whereClause.status = status;
    if (orderId) whereClause.orderId = parseInt(orderId);

    const shipments = await prisma.shipment.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            items: { include: { variant: { include: { product: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

