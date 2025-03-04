import createBlogs from "../models/CreateblogsModels.js";
import fs from "fs";
import path from "path"; 
import { uploadBlogImage } from "../middleware/singleMulter.js";

export const createUserBlogs = async (req, res) => {
  const { title, content, tags, categories } = req.body;

  if (!title || !content || !categories) {
    return res.status(400).json({ message: "Title, content, and category are required." });
  }

  try {
    // ✅ Extract multiple image file paths
    const images =  req.files.map(file => file.filename);

    const newBlog = new createBlogs({
      vendor: req.user._id,
      title,
      content,
      image: images, // ✅ Store multiple images
      categories,
      tags: tags ? tags.split(",") : [], // Convert tags to array
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

// Get all blogs with pagination, search, tags, and category filters
import mongoose from "mongoose";

export const getAllBlogs = async (req, res) => {
  const { page = 1, pageSize = 10, search, tags, categories, vendorId } = req.query;

  try {
    const filters = {};
    if (search) filters.title = { $regex: search, $options: 'i' };
    if (tags) filters.tags = { $in: tags.split(',') };
    if (categories) filters.categories = categories;
    if (vendorId) filters.vendor = new mongoose.Types.ObjectId(vendorId); // ✅ Convert to ObjectId

    const baseURL = "http://localhost:8080/assets/blogs"; // ✅ Blogs images base URL

    const blogs = await createBlogs.find(filters)
      .skip((page - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize))
      .populate("vendor", "name email") // ✅ Populate vendor details
      .populate("likes", "name") // ✅ Populate likes to get user names
      .populate("comments.user", "name"); // ✅ Populate commenters

    // ✅ Add full image URLs
    const blogsWithImages = blogs.map(blog => ({
      ...blog.toObject(),
      image: blog.image?.map(img => `${baseURL}/${img}`) || [],
    }));

    const totalBlogsCount = await createBlogs.countDocuments(filters);

    res.status(200).json({
      message: "Blogs fetched successfully",
      data: blogsWithImages,
      total: totalBlogsCount,
    });
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(400).json({ error: err.message });
  }
};



// Get a single blog with populated comments and likes
export const getBlogById = async (req, res) => {
  try {
    const baseURL = "http://localhost:8080/assets/blogs"; // ✅ Base URL for blogs images
    const blog = await createBlogs.findById(req.params.id).populate('comments.user', 'name');

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    // ✅ Convert image filenames into full URLs
    const blogWithImageURL = {
      ...blog.toObject(),
      image: blog.image?.map(img => `${baseURL}/${img}`) || [],
    };

    res.status(200).json({
      message: "Blog fetched successfully",
      data: blogWithImageURL,
    });
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    res.status(400).json({ error: error.message });
  }
};


// Update a blog post
export const updateBlog = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    const { title, content, tags, categories, imagesToDelete } = req.body;

    const blog = await createBlogs.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    let updatedImages = [...blog.image];

    // 🗑️ **Delete Images if Provided**
    if (imagesToDelete) {
      const imagesArray = imagesToDelete.split(",").map((img) => img.trim());
      imagesArray.forEach((img) => {
        const imagePath = path.join("resource", "static", "assets", "blogs", img);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          updatedImages = updatedImages.filter((image) => image !== img);
          console.log(`🗑️ Deleted image: ${img}`);
        } else {
          console.warn(`⚠️ Image not found: ${img}`);
        }
      });
    }

    // 📤 **Add New Uploaded Images**
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.filename);
      updatedImages.push(...newImages);
      console.log(`✅ Added images: ${newImages}`);
    }

    // 🔄 **Update Blog Details**
    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tags ? tags.split(",") : blog.tags;
    blog.categories = categories || blog.categories;
    blog.image = updatedImages;

    await blog.save();

    // ✅ **Format Images Like getAllBlogs**
    const blogWithImageURLs = {
      ...blog.toObject(),
      image: blog.image.map(img => `/assets/blogs/${img}`), // ✅ Same format as getAllBlogs
    };

    res.status(200).json({
      message: "✅ Blog updated successfully",
      data: blogWithImageURLs,
    });
  } catch (error) {
    console.error("❌ Error updating blog:", error);
    res.status(500).json({ error: error.message });
  }
};




// Delete a blog post
export const deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await createBlogs.findByIdAndDelete(req.params.id);

    if (!deletedBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // ✅ Blogs images base URL
    const baseURL = "http://localhost:8080/assets/blogs";

    // ✅ Delete ke baad updated list fetch karna
    const remainingBlogs = await createBlogs.find()
      .populate("vendor", "name email") // ✅ Populate vendor details
      .populate("likes", "name") // ✅ Populate likes to get user names
      .populate("comments.user", "name") // ✅ Populate commenters
      .lean(); // ✅ Convert mongoose docs to plain JS objects

    // ✅ Add full image URLs
    const blogsWithImages = remainingBlogs.map(blog => ({
      ...blog,
      image: blog.image?.map(img => `${baseURL}/${img}`) || [],
    }));

    res.status(200).json({
      message: "Blog deleted successfully",
      data: blogsWithImages, // ✅ Pure blogs data with images & details
      total: blogsWithImages.length, // ✅ Remaining blogs count
    });
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

    // ✅ Blogs images base URL
    const baseURL = "http://localhost:8080/assets/blogs";

    // ✅ Populate vendor, likes, and comments
    const updatedBlog = await createBlogs.findById(req.params.id)
      .populate("vendor", "name email")
      .populate("likes", "name")
      .populate("comments.user", "name")
      .lean();

    // ✅ Add full image URLs
    updatedBlog.image = updatedBlog.image?.map(img => `${baseURL}/${img}`) || [];

    res.status(200).json({ message: "Blog liked successfully", data: updatedBlog });
  } catch (error) {
    console.error("Error liking blog:", error);
    res.status(400).json({ error: error.message });
  }
};

// ✅ Unlike a blog post with full image URLs
export const unlikeBlog = async (req, res) => {
  try {
    const blog = await createBlogs.findById(req.params.id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.likes = blog.likes.filter(userId => userId.toString() !== req.user._id.toString());
    await blog.save();

    // ✅ Blogs images base URL
    const baseURL = "http://localhost:8080/assets/blogs";

    // ✅ Populate vendor, likes, and comments
    const updatedBlog = await createBlogs.findById(req.params.id)
      .populate("vendor", "name email")
      .populate("likes", "name")
      .populate("comments.user", "name")
      .lean();

    // ✅ Add full image URLs
    updatedBlog.image = updatedBlog.image?.map(img => `${baseURL}/${img}`) || [];

    res.status(200).json({ message: "Blog unliked successfully", data: updatedBlog });
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

    // ✅ New comment object
    const newComment = {
      user: req.user._id,
      comment,
      createdAt: new Date()
    };

    blog.comments.push(newComment);
    await blog.save();

    // ✅ Base URL for profile images
    const profileBaseURL = "http://localhost:8080/assets/profile";

    // ✅ Fetch updated blog with populated comments
    const updatedBlog = await createBlogs.findById(req.params.id)
      .populate("vendor", "name email") // Vendor info
      .populate("likes", "name") // Likes info
      .populate("comments.user", "name profile_img") // Populate name & profile_img
      .lean();

    // ✅ Modify comments to include full profile image URL
    updatedBlog.comments = updatedBlog.comments.map(cmt => ({
      _id: cmt._id,
      comment: cmt.comment,
      createdAt: cmt.createdAt,
      user: {
        _id: cmt.user._id,
        name: cmt.user.name,
        profile_img: cmt.user.profile_img
          ? `${profileBaseURL}/${cmt.user.profile_img}` // Convert filename to full URL
          : null
      }
    }));

    res.status(200).json({ 
      message: "Comment added successfully", 
      data: updatedBlog // ✅ Full blog with formatted comments
    });

  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(400).json({ error: error.message });
  }
};

