import createBlogs from "../models/CreateblogsModels.js";

// Create a new blog post
export const createUserBlogs = async (req, res) => {
  const { title, content, tags, image } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required." });
  }

  try {
    const newBlog = new createBlogs({
      vendor: req.user._id,
      title,
      content,
      image: image || [],
      tags: tags || [],
      createdAt: new Date(),
    });

    await newBlog.save();

    res.status(200).json({
      message: "Blog created successfully",
      data: newBlog,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get all blogs with pagination and search
export const getAllBlogs = async (req, res) => {
  const { page = 1, pageSize = 10, search, tags } = req.query;

  try {
    const filters = {};

    if (search) filters.title = { $regex: search, $options: 'i' };
    if (tags) filters.tags = { $in: tags.split(',') };

    const blogs = await createBlogs.aggregate([
      { $match: filters },
      { $skip: (page - 1) * pageSize },
      { $limit: parseInt(pageSize) },
    ]);

    const totalBlogsCount = await createBlogs.countDocuments(filters);

    res.status(200).json({
      message: "Blogs fetched successfully",
      data: blogs,
      total: totalBlogsCount,
    });
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(400).json({ error: err.message });
  }
};

// Get single blog with comments and likes
export const getBlogById = async (req, res) => {
  try {
    const blog = await createBlogs.findById(req.params.id).populate('comments.user', 'name');

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.status(200).json({
      message: "Blog fetched successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    res.status(400).json({ error: error.message });
  }
};

// Update a blog post
export const updateBlog = async (req, res) => {
  const { title, content, tags, image } = req.body;

  try {
    const updatedBlog = await createBlogs.findByIdAndUpdate(
      req.params.id,
      { title, content, tags, image },
      { new: true }
    );

    if (!updatedBlog) return res.status(404).json({ message: "Blog not found" });

    res.status(200).json({
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(400).json({ error: error.message });
  }
};

// Delete a blog post
export const deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await createBlogs.findByIdAndDelete(req.params.id);

    if (!deletedBlog) return res.status(404).json({ message: "Blog not found" });

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(400).json({ error: error.message });
  }
};

// Like a blog post
export const likeBlog = async (req, res) => {
  try {
    const blog = await createBlogs.findById(req.params.id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    if (blog.likes.includes(req.user._id)) {
      return res.status(400).json({ message: "You already liked this blog" });
    }

    blog.likes.push(req.user._id);
    await blog.save();

    res.status(200).json({ message: "Blog liked successfully", data: blog });
  } catch (error) {
    console.error("Error liking blog:", error);
    res.status(400).json({ error: error.message });
  }
};

// Unlike a blog post
export const unlikeBlog = async (req, res) => {
  try {
    const blog = await createBlogs.findById(req.params.id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.likes = blog.likes.filter(userId => userId.toString() !== req.user._id.toString());
    await blog.save();

    res.status(200).json({ message: "Blog unliked successfully", data: blog });
  } catch (error) {
    console.error("Error unliking blog:", error);
    res.status(400).json({ error: error.message });
  }
};

// Add a comment to a blog post
export const commentOnBlog = async (req, res) => {
  const { comment } = req.body;

  if (!comment) return res.status(400).json({ message: "Comment is required." });

  try {
    const blog = await createBlogs.findById(req.params.id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.comments.push({ user: req.user._id, comment });
    await blog.save();

    res.status(200).json({ message: "Comment added successfully", data: blog });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(400).json({ error: error.message });
  }
};
