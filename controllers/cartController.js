import { jwtDecode } from "jwt-decode";
import userCart from "../models/cartModel.js";
import userProducts from "../models/productsModels.js";

export const addToCart = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = jwtDecode(token);

    const { productId, count } = req.body;

    const user = await userCart.findOne({ userId: decoded._id });

    let product = user?.product;

    const checkProductId = product?.find((ele) =>
      ele?.product_id == productId ? true : false
    );

    product?.push({ product_id: productId, count });

    if (user && checkProductId?.product_id != productId) {
      await userCart.updateOne(
        { userId: decoded._id },
        {
          product,
        }
      );
      res.status(200).json({ message: "Cart Added Successfully" });
    } else if (user && checkProductId?.product_id == productId) {
      res.status(409).json({ code:409, message: "Cart is already exist" });
    } else {
    const cart=  new userCart({
        product: { product_id: productId },
        userId: decoded._id,
      });
      await cart.save();
      res.status(200).json({ message: "Cart Added Successfully" });
    }
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

export const updateCart = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = jwtDecode(token);
    const { productId, count } = req.body;
    const cart = await userCart.findOne({ userId: decoded._id }).lean();

    let product = cart?.product;

    product.forEach((item) => {
      if (item.product_id == productId) {
        item.count = count;
      }
    });

    let data = await userCart.findOneAndUpdate(
      { userId: cart.userId },
      { product },
      { new: true }
    );
    res.status(200).json({ message: "Cart updated successfully", data });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

export const getCarts = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = jwtDecode(token);

    const allProducts = await userProducts.find();
    let cart = await userCart.findOne({ userId: decoded._id }).lean();

    const populatedProducts = cart?.product?.map(item => {
      let data = allProducts.find((product) => item?.product_id == String(product?.id));
      return data;
    });

    res.status(200).json({ code: 200, data: populatedProducts });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};
