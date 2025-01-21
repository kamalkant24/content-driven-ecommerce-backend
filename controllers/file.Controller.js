import fs from "fs";
import { config } from "dotenv";
import archiver from "archiver";
config();

const basedir = process.env.API_URL;

export const upload = async (req, res) => {
  try {
    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file.originalname,
    });
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

export const getListFiles = (req, res) => {
  const directoryPath = "./resource/static/assets/uploads";

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      res.status(500).send({
        message: "Unable to scan files!",
        error: err.message,
      });
    }

    let fileInfos = [];

    files.forEach((file) => {
      fileInfos.push({
        name: file,
        url: "file://" + process.cwd() + "/resource/static/assets/uploads/" + file,
      });
    });

    res.status(200).send(fileInfos);
  });
};

// New endpoint for bulk download
export const download = (req, res) => {
  const directoryPath = "./resource/static/assets/uploads/";

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      return res.status(500).send({
        message: "Unable to scan files!",
        error: err.message,
      });
    }

    if (files.length === 0) {
      return res.status(404).send({
        message: "No files found in the directory.",
      });
    }

    // Create a zip file or another format to archive all files
    // Respond with the archive file for the client to download
    // You may use a library like 'archiver' to create the archive

    // Example using 'archiver' library
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level
    });

    res.attachment("all_files.zip"); // Set the archive file name

    archive.pipe(res);

    files.forEach((file) => {
      const filePath = `${directoryPath}${file}`;
      archive.file(filePath, { name: file });
    });

    archive.finalize();
  });
};