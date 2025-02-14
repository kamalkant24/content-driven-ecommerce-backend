// Vendor & Customer Product Controller

import userProducts from "../models/productsModels.js";
import fs from "fs";
import path from "path";

// Middleware: Check if user is a vendor
const isVendor = (req, res, next) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: "Access denied. Only vendors can perform this action." });
  }
  next();
};

// Create a new product (Vendor Only)
export const createUserProducts = [isVendor, async (req, res) => {
  const { title, price, description, category, quantity, discount, variants } = req.body;

  if (!title || !price || !description || !category || quantity === undefined) {
    return res.status(400).json({ message: "Missing required fields: title, price, description, category, quantity" });
  }

  if (discount && (discount < 0 || discount > 100)) {
    return res.status(400).json({ message: "Discount must be between 0 and 100" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "At least one image is required" });
  }

  const fileNames = req.files.map(file => file.filename);

  if (variants && variants.some(v => !v.size || !v.color)) {
    return res.status(400).json({ message: "Each variant must have size and color" });
  }

  try {
    const newProduct = new userProducts({
      vendor: req.user._id,
      title,
      price,
      description,
      category,
      quantity,
      discount,
      variants: variants || [],
      availability: quantity > 0,
      images: fileNames, // Supports multiple images
    });

    const savedProduct = await newProduct.save();
    res.status(201).json({ message: "Product created successfully", data: savedProduct });
  } catch (error) {
    res.status(500).json({ message: "Error creating the product", error: error.message });
  }
}];

// Update Product (Vendor Only)

export const updateProduct = [
 // ✅ Multer Middleware
  async (req, res) => {
    const { title, price, description, category, quantity, discount, variants, imagesToDelete } = req.body;

    try {
      const existingProduct = await userProducts.findById(req.params.id);
      if (!existingProduct) return res.status(404).json({ message: "Product not found" });

      let updatedImages = [...existingProduct.images];

      // 🗑️ **Delete Multiple Old Images**
      if (imagesToDelete) {
        const imagesArray = imagesToDelete.split(",").map((img) => img.trim()); // Convert comma-separated to array
        imagesArray.forEach((img) => {
          const imagePath = path.join("resource", "static", "assets", "products", img);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`🗑️ Deleted image: ${img}`);
            updatedImages = updatedImages.filter((image) => image !== img);
          } else {
            console.warn(`⚠️ File not found: ${img}`);
          }
        });
      }

      // 📤 **Add New Images**
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => file.filename);
        updatedImages = [...updatedImages, ...newImages];
        console.log(`✅ New images added: ${newImages}`);
      }

      const updatedData = {
        title: title || existingProduct.title,
        price: price || existingProduct.price,
        description: description || existingProduct.description,
        category: category || existingProduct.category,
        quantity: quantity !== undefined ? quantity : existingProduct.quantity,
        discount: discount !== undefined ? discount : existingProduct.discount,
        variants: variants || existingProduct.variants,
        availability: (quantity !== undefined ? quantity : existingProduct.quantity) > 0,
        images: updatedImages,
      };

      const updatedProduct = await userProducts.findByIdAndUpdate(req.params.id, updatedData, { new: true });
      res.status(200).json({ message: "✅ Product updated successfully", data: updatedProduct });
    } catch (error) {
      console.error("❌ Error updating the product:", error);
      res.status(500).json({ message: "Error updating the product", error: error.message });
    }
  }
];


// Delete Product (Vendor Only)
export const deleteProduct = [isVendor, async (req, res) => {
  try {
    const deletedProduct = await userProducts.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: "Product not found" });

    deletedProduct.images.forEach(img => {
      const imagePath = path.join("resource", "static", "assets", "products", img);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting the product", error: error.message });
  }
}];

// Get All Products (Accessible to Both Customers and Vendors)
export const getAllProducts = async (req, res) => {
  const { page = 1, pageSize = 10, search, category, vendor, minPrice, maxPrice, sortByPrice } = req.query;

  try {
    const filters = {};
    if (search) filters.title = { $regex: search, $options: "i" };
    if (category) filters.category = category;
    if (vendor) filters.vendor = vendor;
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    const sortOrder = {};
    if (sortByPrice === 'low-to-high') sortOrder.price = 1;
    else if (sortByPrice === 'high-to-low') sortOrder.price = -1;

    const products = await userProducts.find(filters)
      .sort(sortOrder)
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));

    const totalCount = await userProducts.countDocuments(filters);
    res.status(200).json({ data: products, total: totalCount, message: "Products fetched successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

// Get Product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await userProducts.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ message: "Product fetched successfully", data: product });
  } catch (error) {
    res.status(500).json({ message: "Error fetching the product", error: error.message });
  }
};

// Get all products for the authenticated vendor
export const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const products = await userProducts.find({ vendor: vendorId });

    res.status(200).json({
      message: "Vendor products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching vendor products:", error);
    res.status(500).json({
      message: "Error fetching vendor products",
      error: error.message,
    });
  }
};
