import userProducts from "../models/productsModels.js";

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
