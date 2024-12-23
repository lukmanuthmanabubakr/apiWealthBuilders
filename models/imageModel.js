const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  imageBase64: String,
});

module.exports = mongoose.model("Image", ImageSchema);
