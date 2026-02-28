const pool = require("../config/db");

async function createProduct(product) {
  const query = `
    INSERT INTO products (name, category, price, stock)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;

  const values = [
    product.name,
    product.category,
    product.price,
    product.stock
  ];

  const result = await pool.query(query, values);
  return result.rows[0].id;
}

module.exports = { createProduct };