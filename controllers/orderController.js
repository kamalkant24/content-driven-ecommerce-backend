import Stripe from "stripe";
import jsonwebtoken from "../jwt/jwt.js";
import Order from "../models/orderModel.js";
import userCart from "../models/cartModel.js";
import CheckoutModel from "../models/checkoutModel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { verifyToken } from "../middleware/authMiddleware.js";
import userRegister from "../models/newUserRegisterModel.js"
import {sendOrderConfirmationEmail} from "../utils/sendEmail.js";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const checkout = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized access." });

    const { shipping, offer } = req.body;
    if (!shipping?.price || !offer?.discount)
      return res.status(400).json({ message: "Invalid shipping or offer details." });

    // ✅ Fetch only the logged-in user's cart
    const cart = await userCart.findOne({ customer: req.user._id })
      .populate("products.product", "title price discount_price");

    if (!cart || !cart.products.length) 
      return res.status(400).json({ message: "Cart is empty." });

    // ✅ Step 1: Calculate total product price before discount
    let totalProductPrice = cart.products.reduce(
      (sum, item) => sum + ((item.product.discount_price ?? item.product.price) * item.quantity),
      0
    );

    // ✅ Ensure that totalPrice in checkout is SAME as in cart
    if (totalProductPrice !== cart.totalPrice) {
      console.error("Mismatch in totalPrice!", { cartTotal: cart.totalPrice, calculatedTotal: totalProductPrice });
      return res.status(400).json({ message: "Total price mismatch. Please refresh your cart." });
    }

    // ✅ Step 2: Apply discount only on products
    const discountAmount = (totalProductPrice * offer.discount) / 100;
    const discountedPrice = totalProductPrice - discountAmount;

    // ✅ Step 3: Add shipping charge AFTER discount
    const netPrice = (discountedPrice + shipping.price).toFixed(2);

    console.log({
      totalProductPrice, 
      discountAmount, 
      discountedPrice, 
      shippingCharge: shipping.price,
      netPrice
    });

    // ✅ Prepare Stripe Line Items
    const lineItems = cart.products.map(item => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.product.title },
        unit_amount: Math.round((item.product.discount_price ?? item.product.price) * 100),
      },
      quantity: item.quantity,
    }));

    // ✅ Add Shipping as a Separate Line Item
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping" },
        unit_amount: Math.round(shipping.price * 100),
      },
      quantity: 1,
    });

    // ✅ Fetch User Details
    let user = await userRegister.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // ✅ Manage Stripe Customer ID
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: `${user.firstName} ${user.lastName}`,
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // ✅ Apply Discount as a Stripe Coupon (Only for Products)
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(discountAmount * 100), // Convert to cents
      currency: "usd",  // ✅ Fix: Currency added
      duration: "once",
    });

    // ✅ Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer: stripeCustomerId,
      success_url: `${process.env.CLIENT_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/order-cancelled`,
      line_items: lineItems,
      discounts: [{ coupon: coupon.id }],
      metadata: { userId: req.user._id },
    });

    // ✅ Save Checkout Details
    await new CheckoutModel({
      customer: req.user._id,
      noOfItems: cart.products.length,
      totalPrice: totalProductPrice, // Products total before discount
      shipping,
      offer,
      netPrice,
      stripeSessionId: session.id,
      stripeCustomerId,
      products: cart.products.map(p => ({ product: p.product._id, quantity: p.quantity })),
    }).save();

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ errorMessage: error.message });
  }
};


export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error("❌ No stripe-signature header provided.");
    return res.status(400).json({ message: "No stripe-signature header value was provided." });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`✅ Signature verified. Event type: ${event.type}`);
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    try {
      // Retrieve Checkout Session associated with the Payment Intent
      const sessionList = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
      });

      if (!sessionList.data.length) {
        console.warn(`⚠️ No Checkout Session found for Payment Intent: ${paymentIntent.id}`);
        return res.status(404).json({ message: "Checkout session not found." });
      }

      const session = sessionList.data[0];

      // ✅ Update the Payment Intent with the Checkout Session ID if missing
      if (!paymentIntent.metadata?.stripeSessionId) {
        await stripe.paymentIntents.update(paymentIntent.id, {
          metadata: { stripeSessionId: session.id },
        });
        console.log(`🔄 Added stripeSessionId to Payment Intent metadata: ${session.id}`);
      }

      // Find the checkout data using the Checkout Session ID
      const checkoutData = await CheckoutModel.findOne({ stripeSessionId: session.id }).populate("customer");

      if (!checkoutData) {
        console.warn(`⚠️ No checkout data found for session: ${session.id}`);
        return res.status(404).json({ message: "Checkout data not found." });
      }

      console.log(`🔍 Found checkout session: ${session.id}`);

      // ✅ Fetch user's address (string) from userRegister model
      const user = await userRegister.findById(checkoutData.customer._id);

      if (!user || !user.address) {
        console.warn(`⚠️ No address found for user: ${checkoutData.customer._id}`);
        return res.status(404).json({ message: "User address not found." });
      }

      const shippingAddress = user.address; // Address is a string in the schema

      const newOrder = new Order({
        customer: checkoutData.customer._id,
        products: checkoutData.products,
        totalAmount: checkoutData.netPrice,
        paymentStatus: "completed",
        paymentMethod: session.payment_method_types?.[0] || "unknown",
        orderStatus: "pending",
        shippingAddress, // ✅ Directly use the string address
        createdAt: new Date(checkoutData.createdAt),
      });

      await newOrder.save();
      console.log(`✅ Order saved with ID: ${newOrder._id}`);

      await userCart.findOneAndDelete({ customer: checkoutData.customer._id });
      console.log(`🗑️ User cart cleared for customer: ${checkoutData.customer._id}`);

      const customerEmail = session.customer_details?.email || paymentIntent.receipt_email;
      if (customerEmail) {
        await sendOrderConfirmationEmail(customerEmail, newOrder._id);
        console.log(`📧 Order confirmation email sent to: ${customerEmail}`);
      } else {
        console.warn("⚠️ No customer email found in session or payment intent.");
      }

    } catch (err) {
      console.error(`❌ Error handling payment intent: ${err.message}`);
      return res.status(500).json({ message: "Error processing order." });
    }
  }

  res.status(200).json({ received: true });
};


// ✅ Additionally, ensure you create the Checkout Session with metadata like this:
export const createCheckoutSession = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: { stripeSessionId: 'your_session_id_here' },
      },
      // Add your required checkout options (line items, success URL, etc.)
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error(`❌ Error creating Checkout Session: ${err.message}`);
    res.status(500).json({ message: "Failed to create checkout session." });
  }
};




// ✅ Get all orders for a user
export const getUserOrders = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) return res.status(401).json({ message: "Invalid or expired token" });

    const orders = await Order.find({ customer: decoded._id }).populate("products.product");

    if (!orders.length) return res.status(404).json({ message: "No orders found" });

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// ✅ Get all orders (Admin only)
export const getAllOrders = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    const orders = await Order.find().populate("customer").populate("products.product");

    if (!orders.length) return res.status(404).json({ message: "No orders found" });

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) return res.status(401).json({ message: "Invalid or expired token" });

    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Sirf order ka owner hi cancel kar sakta hai
    if (order.customer.toString() !== decoded._id.toString()) {
      return res.status(403).json({ message: "You can only cancel your own orders" });
    }

    // Order sirf "pending" state me cancel ho sakta hai
    if (order.orderStatus !== "pending") {
      return res.status(400).json({ message: "Order cannot be cancelled after processing" });
    }

    order.orderStatus = "cancelled";
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};


// ✅ Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) return res.status(401).json({ message: "Invalid or expired token" });

    const order = await Order.findById(orderId).populate("products.product");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.customer.toString() !== decoded._id.toString() && !decoded.isAdmin) {
      return res.status(403).json({ message: "You do not have permission to view this order" });
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// ✅ Update an order's status (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    if (!orderStatus || !["pending", "shipped", "delivered", "cancelled"].includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = orderStatus;
    await order.save();

    res.status(200).json({ message: `Order status updated to ${orderStatus}` });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// ✅ Delete an order (Admin only)
export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    await order.remove();

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// ✅ Email Notification Function
// const sendOrderConfirmationEmail = async (email, orderId) => {
//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: "Order Confirmation",
//     text: `Your order has been placed successfully. Your order ID is ${orderId}.`,
//   };

//   await transporter.sendMail(mailOptions);
// };
