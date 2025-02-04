// import mongoose from "mongoose";
// import dotenv from "dotenv";
// dotenv.config();
// // connect with local mongoDB
// const dbHost = process.env.DATABSE_URL;

// const mondoDB = async () => {
//   try {
//     await mongoose
//       .connect(dbHost)
//       .then(() => {
//         console.log("Connected with database");
//       })
//       .catch((err) => console.log("Disconnected", err));
//   } catch (err) {}
// };

// export default mondoDB;


import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const dbHost = process.env.DATABASE_URL;

const mondoDB = async () => {
  try {
    if (!dbHost) {
      console.error("DATABASE_URL is not defined in the .env file.");
      process.exit(1);  // Exit if the DATABASE_URL is missing
    }

    await mongoose.connect(dbHost, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected with database");
  } catch (err) {
    console.error("Error connecting to the database:", err.message);
    process.exit(1);  // Exit on connection failure
  }
};

export default mondoDB;
