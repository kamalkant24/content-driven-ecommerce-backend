import UserRegister from "../models/newUserRegisterModel.js";
import bcrypt from "bcrypt";
import jsonwebtoken from "../jwt/jwt.js";
import { jwtDecode } from "jwt-decode";
import sendEmail from "../utils/sendEmail.js";
import randString from "../utils/randString.js";

// Standard JSON Response Format
const jsonResponse = (status, code, message, data = null) => {
  return { status, code, message, data };
};

// User Registration
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, address, org_Name, org_Size, description } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json(jsonResponse("error", 400, "All required fields must be filled"));
    }

    if (password !== confirmPassword) {
      return res.status(400).json(jsonResponse("error", 400, "Passwords do not match"));
    }

    const existingUser = await UserRegister.findOne({ email });
    if (existingUser) {
      return res.status(400).json(jsonResponse("error", 400, "Email already registered"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueString = randString();

    const user = await UserRegister.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      org_Name,
      org_Size,
      description,
      isValid: false,
      isApproved: false,
      uniqueString,
    });

    sendEmail(email, uniqueString);
    return res.status(200).json(jsonResponse("success", 200, "Registered successfully. Please verify your email.", user));
  } catch (error) {
    return res.status(400).json(jsonResponse("error", 400, error.message));
  }
};
// User Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(jsonResponse("error", 400, "Email and password are required"));
    }

    const user = await UserRegister.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json(jsonResponse("error", 400, "Invalid email or password"));
    }

    if (!user.isValid) return res.status(401).json(jsonResponse("error", 401, "Email not verified"));
    if (user.role === "vendor" && !user.isApproved) return res.status(403).json(jsonResponse("error", 403, "Vendor account pending approval"));

    const token = jsonwebtoken(user);
    return res.status(200).json(jsonResponse("success", 200, "Login successful", { user, token }));
  } catch (error) {
    return res.status(500).json(jsonResponse("error", 500, "Login failed"));
  }
};

// Get All Users 
export const getAllUser = async (req, res) => {
  const { page = 1, pageSize = 10, search } = req.query;
  const token = req.header("Authorization");

  // Check if the token is provided
  if (!token) {
    return res.status(401).json(
      jsonResponse("error", 401, "Authorization token is required")
    );
  }

  try {
    // Decode the token to get user info
    const decoded = jwtDecode(token);

    // Check if the user is an admin
    if (decoded.role !== "admin") {
      return res.status(403).json(
        jsonResponse("error", 403, "Only admin can view all users")
      );
    }

    // Pagination and Search Query
    const allUsers = await UserRegister.aggregate([
      { $match: { email: { $regex: search || "", $options: "i" } } },
      { $skip: (page - 1) * pageSize },
      { $limit: parseInt(pageSize) },
    ]);

    const totalUsersCount = await UserRegister.countDocuments({
      email: { $regex: search || "", $options: "i" },
    });

    return res.status(200).json(
      jsonResponse("success", 200, "Users retrieved successfully", {
        users: allUsers,
        total: totalUsersCount,
      })
    );
  } catch (err) {
    return res.status(400).json(
      jsonResponse("error", 400, err.message)
    );
  }
};


// Delete User (Admin Only)
export const deleteUser = async (req, res) => {
  const { email } = req.body;
  const token = req.header("Authorization");

  // Check if token is provided
  if (!token) {
    return res.status(401).json(
      jsonResponse("error", 401, "Authorization token is required")
    );
  }

  try {
    // Decode the token to get user info
    const decoded = jwtDecode(token);

    // Check if the user is an admin
    if (decoded.role !== "admin") {
      return res.status(403).json(
        jsonResponse("error", 403, "Only admin can delete users")
      );
    }

    // Check if the email is provided
    if (!email) {
      return res.status(400).json(
        jsonResponse("error", 400, "Email is required to delete a user")
      );
    }

    const result = await UserRegister.deleteOne({ email });

    // Check if the user was found and deleted
    if (result.deletedCount === 0) {
      return res.status(404).json(
        jsonResponse("error", 404, "User with this email does not exist")
      );
    }

    return res.status(200).json(
      jsonResponse("success", 200, "User deleted successfully", result)
    );

  } catch (err) {
    return res.status(400).json(
      jsonResponse("error", 400, err.message)
    );
  }
};

export const updateUser = async (req, res) => {
  console.log("Request Body:", req.body);   // ✅ Check form fields
  console.log("Request Files:", req.files); // ✅ Check uploaded files

  const { email, name, phone, address, org_Name, industry, org_Size, description } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json(jsonResponse("error", 400, "Email is required"));
  }

  const trimmedEmail = email.trim().toLowerCase();

  try {
    console.log("Looking for user with email:", trimmedEmail);

    const user = await UserRegister.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json(jsonResponse("error", 404, "User not found"));
    }

    const updateData = { name, phone, address, description, org_Name, industry, org_Size };

    // Logo upload for both customers and vendors
    if (req.files?.logo && req.files.logo.length > 0) {
      updateData.profile_img = req.files.logo[0].filename; 
    }

    // Banner upload only for vendors
    if (user.role === "vendor") {
      if (req.files?.banner && req.files.banner.length > 0) {
        updateData.banner = req.files.banner[0].filename;
      }
    }

    const updatedUser = await UserRegister.findOneAndUpdate(
      { email: trimmedEmail },
      updateData,
      { new: true }
    );

    return res.status(200).json(jsonResponse("success", 200, "Update successful", updatedUser));
  } catch (err) {
    console.error("Error during user update:", err);
    return res.status(500).json(
      jsonResponse("error", 500, "Internal Server Error", { details: err.message })
    );
  }
};




// Get User Profile (Logged-In User Only)
export const getUserProfile = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = jwtDecode(token);
    const user = await UserRegister.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(404).json(jsonResponse("error", 404, "User not found"));
    }

    // Add full URL for profile_img
    if (user.profile_img) {
      user.profile_img = `http://localhost:8080/image/${user.profile_img}`;
    }

    // ✅ Add full URL for vendor's banner
    if (user.role === "vendor" && user.banner) {
      user.banner = `http://localhost:8080/image/${user.banner}`;
    }

    return res
      .status(200)
      .json(jsonResponse("success", 200, "User profile retrieved successfully", user));
  } catch (err) {
    return res.status(400).json(jsonResponse("error", 400, err.message));
  }
};


// Log Out Functionality (User Session End)
export const logOut = async (req, res) => {
  try {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    res.status(200).json("User logged out successfully");
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Verify Email API (For Registration Confirmation)
export const verifyApi = async (req, res) => {
  try {
    const { uniqueString } = req.params;
    const user = await UserRegister.findOne({ uniqueString });

    if (!user) return res.status(400).json({ error: "User not found" });

    user.isValid = true;
    user.uniqueString = ""; 
    await user.save();

    res.status(200).json({ code: 200, message: "User verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Approval for Vendor Accounts
export const approveVendor = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserRegister.findOne({ email });
    if (!user || user.role !== 'vendor') {
      return res.status(400).json({ error: "Vendor not found" });
    }

    user.isApproved = true;
    await user.save();
    res.status(200).json({ message: "Vendor approved successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error approving vendor" });
  }
};

// Confirmation API (Assign Role Here with Logo and Banner Upload)
export const confirmationApi = async (req, res) => {
  try {
    console.log("=== Uploaded Files ===", req.files); // Debugging uploaded files
    console.log("=== Request Body ===", req.body);   // Debugging form data

    const token = req.header("Authorization");
    const decoded = jwtDecode(token);

    const { org_Name, industry, org_Size, description, role } = req.body;

    if (!["vendor", "customer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const updateData = {
      isReadDocumentation: true,
      org_Name,
      industry: role === "vendor" ? industry : undefined,
      org_Size,
      description,
      role,
      isApproved: role === "customer", // Customers are approved by default
    };

    // Safely accessing uploaded files
    const logoFile = req.files?.logo?.[0];
    const bannerFile = req.files?.banner?.[0];

    console.log("Logo File:", logoFile);     // Log logo details
    console.log("Banner File:", bannerFile); // Log banner details

    // Check for logo (required for both customers and vendors)
    if (!logoFile) {
      return res.status(400).json({ error: "Logo is required for both customers and vendors" });
    }
    updateData.profile_img = logoFile.filename; // ✅ Save logo as profile_img

    // Check for banner (required only for vendors)
    if (role === "vendor") {
      if (!bannerFile) {
        return res.status(400).json({ error: "Banner is required for vendors" });
      }
      updateData.banner = bannerFile.filename;
    }

    // Update user information in the database
    await UserRegister.updateOne({ email: decoded.email }, updateData);

    res.status(200).json({ code: 200, message: "Confirmation successful" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: error.message });
  }
};



