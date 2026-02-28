const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

router.post("/products", async (req, res) => {

  const { name, category, price, stock } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Insert product
    const productResult = await client.query(
      `INSERT INTO products(name, category, price, stock)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [name, category, price, stock]
    );

    const productId = productResult.rows[0].id;

    // Insert into OUTBOX (UPDATED SCHEMA)
    await client.query(
      `INSERT INTO outbox(id, topic, payload)
       VALUES($1,$2,$3)`,
      [
        uuidv4(),
        "product-events",
        JSON.stringify({
          eventType: "ProductCreated",
          productId,
          name,
          category,
          price,
          stock,
          timestamp: new Date().toISOString()
        })
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({ productId });

  } catch(err) {

    await client.query("ROLLBACK");
    console.log(err);
    res.status(500).send("error");

  } finally {
    client.release();
  }
});

module.exports = router;