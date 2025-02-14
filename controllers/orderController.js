import jsonwebtoken from "../jwt/jwt.js";  // Custom JWT module
import Order from "../models/orderModel.js";  // Assuming you named your model 'Order'
import userProducts from "../models/productsModels.js";

// Token verification function using custom jsonwebtoken module
const verifyToken = (token) => {
  try {
    return jsonwebtoken.verifyToken(token);  // Assuming verifyToken method is implemented in jsonwebtoken.js
  } catch (error) {
    return null;
  }
};

// Create an order
export const createOrder = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const { products, totalAmount, paymentMethod, shippingAddress } = req.body;

    // Check for product availability
    for (const product of products) {
      const productInDb = await userProducts.findById(product.productId);
      if (productInDb.quantity < product.quantity) {
        return res.status(400).json({ message: `Not enough stock for product ${productInDb.name}` });
      }
    }

    // Create order with provided information
    const newOrder = new Order({
      customer: decoded._id,
      products: products.map((product) => ({
        product: product.productId,
        quantity: product.quantity
      })),
      totalAmount,
      paymentMethod,
      shippingAddress
    });

    // Save the order to the database
    await newOrder.save();
    res.status(201).json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Get all orders for a user (customer)
export const getUserOrders = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Get all orders made by the user (customer)
    const orders = await Order.find({ customer: decoded._id }).populate('products.product');

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.status(200).json({ code: 200, orders });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Get a specific order by ID (for both customers and admins)
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Find the order by ID and populate the products
    const order = await Order.findById(orderId).populate('products.product');

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Allow customers to see only their own orders or admins to see any order
    if (order.customer.toString() !== decoded._id.toString() && !decoded.isAdmin) {
      return res.status(403).json({ message: "You do not have permission to view this order" });
    }

    res.status(200).json({ code: 200, order });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Update order status (for admins or customers)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Fetch the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow customers to modify the order status if it's their own order
    if (order.customer.toString() !== decoded._id.toString() && !decoded.isAdmin) {
      return res.status(403).json({ message: "You do not have permission to update this order" });
    }

    // If the user is an admin or the customer, update the status
    order.orderStatus = orderStatus;
    await order.save();

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Cancel an order (for customers, when order status is pending)
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Find the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order is in a cancellable state (e.g., 'pending')
    if (order.orderStatus !== "pending") {
      return res.status(400).json({ message: "Cannot cancel order. Order has already been processed." });
    }

    // Ensure that the customer who created the order is the one trying to cancel it
    if (order.customer.toString() !== decoded._id.toString()) {
      return res.status(403).json({ message: "You do not have permission to cancel this order" });
    }

    // Update the order status to "cancelled"
    order.orderStatus = "cancelled";
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Delete an order (only if the order status is "pending")
export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = req.header("Authorization");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Find the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow deletion of pending orders
    if (order.orderStatus === "pending") {
      // Ensure that the customer who created the order is the one trying to delete it
      if (order.customer.toString() !== decoded._id.toString()) {
        return res.status(403).json({ message: "You do not have permission to delete this order" });
      }

      await order.remove();
      return res.status(200).json({ message: "Order deleted successfully" });
    } else {
      return res.status(400).json({ message: "Cannot delete order. Order has already been processed" });
    }
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};


// Secure Checkout
export const checkout = async (req, res) => {
  try {
    // Extract & verify token
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    // Get data from request body
    const { shipping, offer } = req.body;
    
    // Validate shipping & offer
    if (!shipping || typeof shipping.price !== "number") {
      return res.status(400).json({ message: "Invalid shipping details" });
    }
    if (!offer || typeof offer.discount !== "number") {
      return res.status(400).json({ message: "Invalid offer details" });
    }

    // Fetch user's cart
    const cart = await userCart.findOne({ customer: decoded._id }).populate("products.product");
    if (!cart || cart.products.length === 0) return res.status(400).json({ message: "Cart is empty" });

    // Calculate total price
    let totalPrice = 0;
    cart.products.forEach(item => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
      }
    });

    // Calculate discount and net price
    const discountAmount = (totalPrice * offer.discount) / 100;
    const netPrice = (totalPrice + shipping.price - discountAmount).toFixed(2);

    // Store checkout details in database (if needed)
    const checkoutData = new CheckoutModel({
      customer: decoded._id,
      noOfItems: cart.products.length,
      totalPrice,
      shipping,
      offer,
      netPrice,
    });
    await checkoutData.save(); // Save to database

    // Send response
    res.status(200).json({ checkoutDetails: checkoutData });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};
