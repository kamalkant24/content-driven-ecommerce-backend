import userProducts from "../models/productsModels.js";
import fs from "fs";
import path from "path";

export const createUserProducts = async (req, res) => {
  const {
    title,
    quantity,
    price,
    createdAt,
    description,
    updateAt,
    cart,
    like,
  } = req.body;

  const fileName = req.files.map((x) => {
    return x.filename;
  });
  try {
    const products = new userProducts({
      title,
      image: fileName,
      quantity,
      price,
      description,
      createdAt,
      updateAt,
      like,
      cart,
 
    });

    const data = await products.save();
    res.status(200).json({ message: "products Created successfully" }); // returning data with status code 200
  } catch (error) {
    // this is for throwing error
    res.status(400).json({ error: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  const { page, pageSize, search } = req.query;

  try {
    const allProducts = await userProducts.aggregate([
      { $match: { title: { $regex: search || "", $options: "i" } } },
      { $skip: (page - 1) * pageSize },
      { $limit: parseInt(pageSize) },
    ]);

    const totalProductsCount = await userProducts.countDocuments({
      title: { $regex: search || "", $options: "i" },
   
    });

    res.status(200).json({ data: allProducts, total: totalProductsCount });
  } catch (err) {
    res.status(400).json({ error: err });
  }
};
export const getProductById = async (req, res) => {
  try {
    const product = await userProducts.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { title, quantity, price, description, createdAt, updateAt, like, cart, removeImages } = req.body;

    console.log("Uploaded files:", req.files); // Debugging log

    // Get new image filenames if uploaded
    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = req.files.map((file) => file.filename);
    }

    // Find the existing product
    const existingProduct = await userProducts.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    let updatedImages = existingProduct.image || [];

    // Remove images from the database & delete from server if removeImages is provided
    if (removeImages) {
      const removeList = typeof removeImages === "string" ? JSON.parse(removeImages) : removeImages;

      removeList.forEach((img) => {
        const imagePath = path.join("uploads", img);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath); // Delete the file from the server
        }
      });

      // Remove images from the database array
      updatedImages = updatedImages.filter((img) => !removeList.includes(img));
    }

    // Only update images if new ones are uploaded, otherwise just remove
    if (newImages.length > 0) {
      updatedImages = [...updatedImages, ...newImages];
    }

    // Prepare updated data
    const updatedData = {
      title: title || existingProduct.title,
      quantity: quantity || existingProduct.quantity,
      price: price || existingProduct.price,
      description: description || existingProduct.description,
      createdAt: createdAt || existingProduct.createdAt,
      updateAt: updateAt || existingProduct.updateAt,
      like: like !== undefined ? like : existingProduct.like,
      cart: cart !== undefined ? cart : existingProduct.cart,
      image: updatedImages, // Update image list in DB
    };

    // Update the product in the database
    const updatedProduct = await userProducts.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true }
    );

    res.status(200).json({ message: "Product updated successfully", data: updatedProduct });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await userProducts.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// export const getAllProducts = async (req, res) => {
//   const { page = 1, pageSize = 10, search = "" } = req.query;
//   const baseUrl = "http://192.168.31.57:8080/image/";

//   try {
//     const allProducts = await userProducts.aggregate([
//       { $match: { title: { $regex: search, $options: "i" } } },
//       { $skip: (parseInt(page) - 1) * parseInt(pageSize) },
//       { $limit: parseInt(pageSize) },
//     ]);

//     // Append image URL to each product
//     const updatedProducts = allProducts.map((product) => ({
//       ...product,
//       imageUrl: product.image ? `${baseUrl}${product.image}` : null,
//     }));

//     const totalProductsCount = await userProducts.countDocuments({
//       title: { $regex: search, $options: "i" },
//     });

//     res.status(200).json({ data: updatedProducts, total: totalProductsCount });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };
