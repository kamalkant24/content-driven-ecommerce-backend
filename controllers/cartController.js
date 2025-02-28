import userCart from "../models/cartModel.js";
import { jwtDecode } from "jwt-decode";
import userProducts from "../models/productsModels.js"
// Add a product to the cart
export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    let userCartData = await userCart.findOne({ customer: req.user._id });

    if (!userCartData) {
      userCartData = new userCart({ customer: req.user._id, products: [] });
    }

    const product = await userProducts.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.quantity < 1) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    const existingProduct = userCartData.products.find(
      (item) => String(item.product) === String(productId)
    );

    if (existingProduct) {
      return res.status(400).json({ message: "Product already in cart. Update quantity instead." });
    }

    userCartData.products.push({ product: productId, quantity: 1 });

    // 🏷️ Decrease product stock
    product.quantity -= 1;
    await product.save();

    await userCartData.save();
    const updatedCart = await userCartData.populate("products.product", "title price discount_price images");

    console.log("Cart Total Price (After Add):", updatedCart.totalPrice); // Debugging

    res.status(200).json({
      message: "Product added to cart",
      cart: updatedCart
    });

  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};


// Get the user's cart and populate product details
export const getCarts = async (req, res) => {
  try {
    const baseURL = "http://localhost:8080/assets/products";

    const cart = await userCart
      .findOne({ customer: req.user._id })
      .populate("products.product", "title price discount_price images");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    console.log("Cart Total Price (Get Cart):", cart.totalPrice); // Debugging

    // Map through cart products to add full image URLs
    const cartWithImageURLs = {
      ...cart.toObject(),
      products: cart.products.map((item) => ({
        ...item.toObject(),
        product: {
          ...item.product.toObject(),
          images: item.product.images?.map((image) => `${baseURL}/${image}`) || [],
        },
      })),
    };

    return res.status(200).json({
      message: "Cart retrieved successfully",
      cart: cartWithImageURLs,
    });

  } catch (error) {
    console.error("Error fetching cart:", error.message);
    res.status(500).json({ errorMessage: error.message });
  }
};
// Update the quantity of a product in the cart
export const updateCart = async (req, res) => {
  try {
    const { productId, count } = req.body;
    const baseURL = "http://localhost:8080/assets/products"; // Define baseURL

    const cart = await userCart.findOne({ customer: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const productIndex = cart.products.findIndex(
      (item) => String(item.product) === String(productId)
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const product = await userProducts.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const quantityDifference = count - cart.products[productIndex].quantity;

    // If increasing quantity, check stock
    if (quantityDifference > 0 && product.quantity < quantityDifference) {
      return res.status(400).json({ message: "Not enough stock available" });
    }

    // Adjust stock accordingly
    product.quantity -= quantityDifference;
    await product.save();

    // Update the cart quantity
    cart.products[productIndex].quantity = count;
    await cart.save();

    const updatedCart = await cart.populate("products.product");

    // **Add image URLs like in getCarts**
    const cartWithImageURLs = {
      ...updatedCart.toObject(),
      products: updatedCart.products.map((item) => ({
        ...item.toObject(),
        product: {
          ...item.product.toObject(),
          images: item.product.images?.map((image) => `${baseURL}/${image}`) || [],
        },
      })),
    };

    return res.status(200).json({
      message: "Cart updated successfully",
      cart: cartWithImageURLs,
    });

  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Remove a product from the cart
export const removeFromCart = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const cart = await userCart.findOne({ customer: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const productIndex = cart.products.findIndex(
      (item) => String(item.product) === String(productId)
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const product = await userProducts.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Increase product quantity back
    product.quantity += cart.products[productIndex].quantity;
    await product.save();

    // Remove product from cart
    cart.products.splice(productIndex, 1);
    await cart.save();

    const updatedCart = await cart.populate("products.product");

    res.status(200).json({
      message: "Product removed from cart",
      cart: updatedCart,
    });

  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};




