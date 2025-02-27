import jwt from 'jsonwebtoken';

const jsonwebtoken = (data) => {
  return jwt.sign(
    { _id: data._id, email: data.email, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
};

export default jsonwebtoken;
