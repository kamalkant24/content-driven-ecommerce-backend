// controllers/wishlistController.js
import Wishlist from "../models/wishlistModel.js";
import userProducts from "../models/productsModels.js";

// Add product to wishlist (Customer Only)
export const addToWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized access." });

    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "Product ID is required." });

    const productExists = await userProducts.findById(productId);
    if (!productExists) return res.status(404).json({ message: "Product not found." });

    let wishlist = await Wishlist.findOne({ customer: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({ customer: req.user._id, products: [{ product: productId }] });
    } else {
      const alreadyInWishlist = wishlist.products.some((p) => p.product.toString() === productId);
      if (alreadyInWishlist) return res.status(400).json({ message: "Product already in wishlist." });

      wishlist.products.push({ product: productId });
    }

    await wishlist.save();
    res.status(200).json({ message: "Product added to wishlist.", wishlist });
  } catch (error) {
    console.error("Add to Wishlist Error:", error);
    res.status(500).json({ errorMessage: error.message });
  }
};

// Get customer's wishlist
export const getWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized access." });

    const baseURL = "http://localhost:8080/assets/products";

    const wishlist = await Wishlist.findOne({ customer: req.user._id })
      .populate("products.product") 
      .select("products createdDate");

    if (!wishlist) return res.status(404).json({ message: "Wishlist not found." });

    // Modify products to include image URLs
    const wishlistWithImageURLs = {
      ...wishlist.toObject(),
      products: wishlist.products.map(item => ({
        ...item.toObject(),
        product: {
          ...item.product.toObject(),
          images: item.product.images?.map(image => `${baseURL}/${image}`) || [],
        }
      }))
    };

    res.status(200).json({ wishlist: wishlistWithImageURLs });

  } catch (error) {
    console.error("Get Wishlist Error:", error);
    res.status(500).json({ errorMessage: error.message });
  }
};


// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized access." });

    const { productId } = req.params;
    if (!productId) return res.status(400).json({ message: "Product ID is required." });

    const wishlist = await Wishlist.findOneAndUpdate(
      { customer: req.user._id },
      { $pull: { products: { product: productId } } },
      { new: true }
    ).populate("products.product", "title price");

    if (!wishlist) return res.status(404).json({ message: "Wishlist not found or product not in wishlist." });

    res.status(200).json({ message: "Product removed from wishlist.", wishlist });
  } catch (error) {
    console.error("Remove from Wishlist Error:", error);
    res.status(500).json({ errorMessage: error.message });
  }
};
