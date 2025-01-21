import createblogs from "../models/CreateblogsModels.js";


export const createUserBlogs = async (req, res) => {
  const { title, image, text, price, createdAt, updateAt } = req.body;
  try {
    const blogs = new createblogs({
      title,
      image,
      text,
      price,
      createdAt,
      updateAt,
    });

    await blogs.save();
    res.status(200).json("blogs Created successfully"); // returning data with status code 200
  } catch (error) {
    // this is for throwing error
    res.status(400).json({ error: error });
  }
};

export const getAllBlogs = async (req, res) => {
  const { page, pageSize, search } = req.query;
  try {
    const allBlogs = await createblogs.aggregate([
        { $match: { title: { $regex: search || '', $options: 'i' } } },
        { $skip: (page - 1) * pageSize },
        { $limit: parseInt(pageSize) }
      ]);
    
      const totalBlogsCount = await createblogs.countDocuments({ title: { $regex: search || '', $options: 'i' } });
    
      res.status(200).json({ data: allBlogs, total: totalBlogsCount });
  } catch (err) {
    console.log(err)
    res.status(400).json({ error: err });
  }
};
