import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
// connect with local mongoDB
const dbHost = process.env.DATABSE_URL;

const mondoDB = async () => {
  try {
    await mongoose
      .connect(dbHost)
      .then(() => {
        console.log("Connected with database");
      })
      .catch((err) => console.log("Disconnected", err));
  } catch (err) {}
};

export default mondoDB;
