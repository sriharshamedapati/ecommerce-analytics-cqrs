const express = require("express");
const pool = require("./config/db");   // ← ADD THIS
const productRoutes = require("./controllers/productController");
const startPublisher = require("./publisher/outboxPublisher");

const app = express();

app.use(express.json());

app.post("/api/orders", async (req, res) => {
  const { customerId, items } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let total = 0;

    for (const item of items) {
      total += item.quantity * item.price;
    }

    const orderResult = await client.query(
      "INSERT INTO orders (customer_id, total, status) VALUES ($1,$2,$3) RETURNING id",
      [customerId, total, "CREATED"]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)",
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    // Write to outbox
    const eventId = require("uuid").v4();

    await client.query(
      "INSERT INTO outbox (id, topic, payload) VALUES ($1,$2,$3)",
      [
        eventId,
        "order-events",
        JSON.stringify({
          eventType: "OrderCreated",
          orderId,
          customerId,
          items,
          total,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({ orderId });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "order creation failed" });
  } finally {
    client.release();
  }
});

// mount router
app.use("/api", productRoutes);

app.listen(8080, () => {
  console.log("command running");
});
startPublisher();