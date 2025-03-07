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

    const cart = await userCart.findOne({ customer: req.user._id })
      .populate("products.product", "title price discount_price");

    if (!cart || !cart.products.length) 
      return res.status(400).json({ message: "Cart is empty." });

    let totalProductPrice = cart.products.reduce(
      (sum, item) => sum + ((item.product.discount_price ?? item.product.price) * item.quantity),
      0
    );

    if (totalProductPrice !== cart.totalPrice) {
      return res.status(400).json({ message: "Total price mismatch. Please refresh your cart." });
    }

    const discountAmount = (totalProductPrice * offer.discount) / 100;
    const discountedPrice = totalProductPrice - discountAmount;
    const netPrice = (discountedPrice + shipping.price).toFixed(2);

    const lineItems = cart.products.map(item => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.product.title },
        unit_amount: Math.round((item.product.discount_price ?? item.product.price) * 100),
      },
      quantity: item.quantity,
    }));

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping" },
        unit_amount: Math.round(shipping.price * 100),
      },
      quantity: 1,
    });

    let user = await userRegister.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: `${user.firstName} ${user.lastName}`,
      });
      stripeCustomerId = customer.id;
      await userRegister.updateOne({ _id: req.user._id }, { stripeCustomerId });
    }

    const coupon = await stripe.coupons.create({
      amount_off: Math.round(discountAmount * 100),
      currency: "usd",
      duration: "once",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer: stripeCustomerId,
      success_url: `http://localhost:5173/payment/pending`, // Temporary pending page
      cancel_url: `http://localhost:5173/payment/failure`, // Failure page remains the same
      line_items: lineItems,
      discounts: [{ coupon: coupon.id }],
      metadata: { userId: req.user._id },
    });

    await new CheckoutModel({
      customer: req.user._id,
      noOfItems: cart.products.length,
      totalPrice: totalProductPrice,
      shipping,
      offer,
      netPrice,
      stripeSessionId: session.id,
      stripeSessionUrl: session.url,
      stripeCustomerId,
      products: cart.products.map(p => ({ product: p.product._id, quantity: p.quantity })),
      paymentStatus: "pending"
    }).save();

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("❌ Checkout Error:", error);
    res.status(500).json({ errorMessage: error.message });
  }
};
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error("❌ No stripe-signature header provided.");
    return res.status(400).json({ message: "No stripe-signature header provided." });
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
      const sessionList = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
      });

      if (!sessionList.data.length) {
        console.warn(`⚠️ No Checkout Session found for Payment Intent: ${paymentIntent.id}`);
        return res.status(404).json({ message: "Checkout session not found." });
      }

      const session = sessionList.data[0];

      if (!paymentIntent.metadata?.stripeSessionId) {
        await stripe.paymentIntents.update(paymentIntent.id, {
          metadata: { stripeSessionId: session.id },
        });
        console.log(`🔄 Added stripeSessionId to Payment Intent metadata: ${session.id}`);
      }

      // ✅ Check if payment is already completed
      const checkoutData = await CheckoutModel.findOne({ stripeSessionId: session.id }).populate("customer");

      if (!checkoutData) {
        console.warn(`⚠️ No checkout data found for session: ${session.id}`);
        return res.status(404).json({ message: "Checkout data not found." });
      }

      if (checkoutData.paymentStatus === "completed") {
        console.warn(`⚠️ Payment already processed for session: ${session.id}`);
        return res.status(200).json({ message: "Payment already processed." });
      }

      console.log(`🔍 Processing payment for session: ${session.id}`);

      // ✅ Update checkout schema with paymentStatus completed
      checkoutData.paymentStatus = "completed";
      await checkoutData.save();
      console.log(`✅ Updated checkout payment status to completed for session: ${session.id}`);

      const user = await userRegister.findById(checkoutData.customer._id);

      if (!user || !user.address) {
        console.warn(`⚠️ No address found for user: ${checkoutData.customer._id}`);
        return res.status(404).json({ message: "User address not found." });
      }

      const shippingAddress = user.address;

      const newOrder = new Order({
        customer: checkoutData.customer._id,
        products: checkoutData.products,
        totalAmount: checkoutData.netPrice,
        paymentStatus: "completed",
        paymentMethod: session.payment_method_types?.[0] || "unknown",
        orderStatus: "pending",
        shippingAddress,
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

      // ✅ Redirect to success page after successful payment
      return res.redirect(`http://localhost:5173/payment/success?session_id=${session.id}`);

    } catch (err) {
      console.error(`❌ Error handling payment intent: ${err.message}`);
      return res.status(500).json({ message: "Error processing order." });
    }
  } else {
    // ❌ Redirect to failure page if payment is not completed
    return res.redirect(`http://localhost:5173/payment/failure`);
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


export const getCheckoutsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const baseUrl = "http://localhost:8080/assets/products/";

    const checkouts = await CheckoutModel.find({ customer: customerId })
      .populate("customer", "firstName lastName email phone")
      .populate({
        path: "products.product",
        select: "title price discount_price description images category brand stock",
      })
      .lean();

    if (!checkouts.length) 
      return res.status(404).json({ message: "No checkout records found for this customer." });

    // ✅ Safely modify image URLs
    checkouts.forEach(checkout => {
      checkout.products.forEach(item => {
        if (item.product && item.product.images && Array.isArray(item.product.images)) {
          item.product.images = item.product.images.map(img => `${baseUrl}${img}`);
        }
      });
    });

    res.status(200).json(checkouts);
  } catch (error) {
    console.error("Get Customer Checkouts Error:", error);
    res.status(500).json({ errorMessage: error.message });
  }
};

export const getOrdersByUserId = async (req, res) => {
  try {
    console.log("Middleware Request Headers:", req.headers); // Debugging

    const { userId } = req.params;
    const decoded = req.user; // ✅ Use req.user from middleware

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Admin can fetch any user's orders, but users can only fetch their own
    if (!decoded.isAdmin && decoded._id.toString() !== userId) {
      return res.status(403).json({ message: "You can only view your own orders" });
    }

    const baseURL = "http://localhost:8080/assets/products";
    const orders = await Order.find({ customer: userId }).populate("products.product");

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    // Add full URLs for product images
    const ordersWithImageURLs = orders.map(order => ({
      ...order.toObject(),
      products: order.products.map(p => ({
        ...p.toObject(),
        product: p.product
          ? {
              ...p.product.toObject(),
              images: Array.isArray(p.product.images)
                ? p.product.images.map(image => `${baseURL}/${image}`)
                : [],
            }
          : null, 
      })),
    }));

    res.status(200).json({ orders: ordersWithImageURLs });

  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ errorMessage: error.message });
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
