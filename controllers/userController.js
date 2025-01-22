import UserRegister from "../models/newUserRegisterModel.js";
import bcrypt from "bcrypt";
import jsonwebtoken from "../jwt/jwt.js";
import { jwtDecode } from "jwt-decode";
import sendEmail from "../utils/sendEmail.js";
import randString from "../utils/randString.js";

export const register = async (req, res) => {
  try {
  const { name, email, password, phone, createdAt } = req.body;
  console.log('password', password);
    const isValid = false;
    const uniqueString = randString();
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("hashedPassword",hashedPassword);
    const data = {
      email: email,
      name: name,
      password: hashedPassword,
      phone: phone,
      isReadDocumentation: false,
      org_Name: "",
      industry: "",
      org_Size: "",
    };
    console.log("data",data);

    const user = await UserRegister.create({ isValid, uniqueString, ...data });

    if (user) {
      sendEmail(email, user.uniqueString);
      res.status(200).json({
        code: 200,
        message: "You are registered now.Please verify your email",
      });
    }
    // res.redirect("back"); // redirecting to the main page
  } catch (error) {
    // this is for throwing error
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserRegister.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Authentication failed" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "wrong password" });
    }
    if (user.isValid == false) {
      return res.status(401).json({ code: 401, error: "User is not verified" });
    }
    const token = jsonwebtoken(user);

    res.status(200).json({
      code: 200,
      token: token,
      message: "User Logged in successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

export const getAllUser = async (req, res) => {
  const { page, pageSize, search } = req.query;

  try {
    const allUser = await UserRegister.aggregate([
      { $match: { email: { $regex: search || "", $options: "i" } } },
      { $skip: (page - 1) * pageSize },
      { $limit: parseInt(pageSize) },
    ]);

    const totalUsersCount = await UserRegister.countDocuments({
      email: { $regex: search || "", $options: "i" },
    });

    res.status(200).json({ data: allUser, total: totalUsersCount });
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

export const deleteUser = async (req, res) => {
  const { email } = req.body;

  try {
    const allUser = await UserRegister.deleteOne({ email: email });

    res.status(200).json("User deleted successfully");
  } catch (err) {
    res.status(400).json({ error: err });
  }
};
// export const updateUser = async (req, res) => {
//   const { email, name, phone } = req.body;
//   try {
//     const allUser = await UserRegister.updateOne(
//       { email: email },
//       { name: name, phone: phone }
//     );
//     res.status(200).json("UpdateSuccess");
//   } catch (err) {
//     res.status(400).json({ error: err });
//   }
// };
export const updateUser = async (req, res) => {
  const { email, name, phone } = req.body;
  try {
    const result = await UserRegister.updateOne(
      { email: email },
      { name: name, phone: phone }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "UpdateSuccess" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const token = req.header("Authorization");
    const decoded = jwtDecode(token);
    const user = await UserRegister.findById(decoded._id)
      .select("-password")
      .select("-confirmPassword");
    user.profile_img = `${"http://localhost:8080/image/" + user.profile_img}`;

    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const logOut = async (req, res) => {
  try {
    const token = req.header("Authorization");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.status(200).json("User logged out successfully");
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const verifyApi = async (req, res) => {
  try {
    const { uniqueString } = req.params;
    const user = await UserRegister.findOne({ uniqueString: uniqueString });
    if (user) {
      user.isValid = true;
      user.uniqueString = "";
      await user.save();
      return res
        .status(200)
        .json({ code: 200, message: "user verified successfully" });
    } else {
      return res.status(400).json({ code: 400, message: "user not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmationApi = async (req, res) => {
  try {
    const { org_Name, industry, org_Size } = req.body;
    const file = req.file;
    const token = req.header("Authorization");
    const decoded = jwtDecode(token);
    await UserRegister.updateOne(
      { email: decoded.email },
      {
        isReadDocumentation: true,
        org_Name: org_Name,
        industry: industry,
        org_Size: org_Size,
        profile_img: file.filename,
      }
    );

    res.status(200).json({ code: 200, message: "confirmed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
