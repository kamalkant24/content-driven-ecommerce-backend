import userCart from "../models/cartModel.js";
import { jwtDecode } from "jwt-decode";

// Add a product to the cart
export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body; 

    let userCartData = await userCart.findOne({ customer: req.user._id });
    if (!userCartData) {
      userCartData = new userCart({ customer: req.user._id, products: [] });
    }

    const existingProduct = userCartData.products.find(
      (item) => String(item.product) === String(productId)
    );

    if (existingProduct) {
      return res.status(400).json({ message: "Product already in cart. Update quantity using update API." });
    }

   
    userCartData.products.push({ product: productId, quantity: 1 });

    await userCartData.save();
    const updatedCart = await userCartData.populate("products.product");

    res.status(200).json({
      message: "Product added to cart with quantity 1",
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
      .populate("products.product");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

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

    cart.products[productIndex].quantity = count;
    await cart.save();

    const updatedCart = await cart.populate("products.product");

    return res.status(200).json({
      message: "Cart updated successfully",
      cart: updatedCart
    });

  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Remove a product from the cart
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

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

    cart.products.splice(productIndex, 1);
    await cart.save();

    const updatedCart = await cart.populate("products.product");

    return res.status(200).json({
      message: "Product removed from cart",
      cart: updatedCart
    });

  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};
