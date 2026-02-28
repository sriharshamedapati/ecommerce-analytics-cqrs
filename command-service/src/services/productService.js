const productRepository = require("../repositories/productRepository");

async function createProduct(data) {
  if (!data.name || !data.category) {
    throw new Error("Invalid product data");
  }

  if (data.price < 0 || data.stock < 0) {
    throw new Error("Price or stock cannot be negative");
  }

  return await productRepository.createProduct(data);
}

module.exports = { createProduct };