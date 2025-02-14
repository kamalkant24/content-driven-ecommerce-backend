import createblogs from "../models/CreateblogsModels.js";

// Create a new blog post
export const createUserBlogs = async (req, res) => {
  const { title, content, tags, image, vendor } = req.body;

  // Validate required fields
  if (!title || !content || !vendor) {
    return res.status(400).json({ message: "Title, content, and vendor are required." });
  }

  try {
    const newBlog = new createblogs({
      vendor: req.user._id,  // Ensure vendor is set to the logged-in vendor's ID
      title,
      content,
      image,
      tags: tags || [],  // Default to an empty array if no tags are provided
      createdAt: new Date(),
    });

    // Save the new blog post
    await newBlog.save();

    res.status(200).json({
      message: "Blog created successfully",
      data: newBlog,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(400).json({
      error: error.message,
    });
  }
};

// Get all blogs with pagination, search, and optional filters
export const getAllBlogs = async (req, res) => {
  const { page = 1, pageSize = 10, search, tags } = req.query;

  try {
    const filters = {};
    
    // Apply search filter on title (case-insensitive)
    if (search) {
      filters.title = { $regex: search, $options: 'i' };
    }

    // Apply tags filter if provided
    if (tags) {
      filters.tags = { $in: tags.split(',') };  // Match any of the provided tags
    }

    // Pagination and fetching blog posts
    const blogs = await createblogs.aggregate([
      { $match: filters },
      { $skip: (page - 1) * pageSize },
      { $limit: parseInt(pageSize) },
    ]);

    // Get total count of blogs matching the filters
    const totalBlogsCount = await createblogs.countDocuments(filters);

    res.status(200).json({
      message: "Blogs fetched successfully",
      data: blogs,
      total: totalBlogsCount,
    });
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(400).json({
      error: err.message,
    });
  }
};

// Get a single blog by ID
export const getBlogById = async (req, res) => {
  try {
    const blog = await createblogs.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({
      message: "Blog fetched successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    res.status(400).json({
      error: error.message,
    });
  }
};

// Update a blog post
export const updateBlog = async (req, res) => {
  const { title, content, tags, image } = req.body;

  try {
    const existingBlog = await createblogs.findById(req.params.id);

    if (!existingBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Update blog fields
    const updatedBlog = await createblogs.findByIdAndUpdate(
      req.params.id,
      { title, content, tags, image },
      { new: true }  // Return the updated blog after saving
    );

    res.status(200).json({
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(400).json({
      error: error.message,
    });
  }
};

// Delete a blog post
export const deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await createblogs.findByIdAndDelete(req.params.id);

    if (!deletedBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(400).json({
      error: error.message,
    });
  }
};

// Like a blog post
export const likeBlog = async (req, res) => {
  try {
    const blog = await createblogs.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if the user has already liked the blog
    const hasLiked = blog.likes.includes(req.user._id);

    if (hasLiked) {
      return res.status(400).json({ message: "You already liked this blog" });
    }

    // Add the user to the likes array
    blog.likes.push(req.user._id);

    await blog.save();

    res.status(200).json({
      message: "Blog liked successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error liking blog:", error);
    res.status(400).json({
      error: error.message,
    });
  }
};

// Unlike a blog post
export const unlikeBlog = async (req, res) => {
  try {
    const blog = await createblogs.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Remove the user from the likes array
    blog.likes = blog.likes.filter(userId => userId.toString() !== req.user._id.toString());

    await blog.save();

    res.status(200).json({
      message: "Blog unliked successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error unliking blog:", error);
    res.status(400).json({
      error: error.message,
    });
  }
};
