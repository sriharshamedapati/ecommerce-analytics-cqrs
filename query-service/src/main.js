const express = require("express");
const { Pool } = require("pg");

const app = express();

const pool = new Pool({
  connectionString: process.env.READ_DATABASE_URL,
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

app.get("/api/analytics/products/:productId/sales", async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      "SELECT * FROM product_sales_view WHERE product_id = $1",
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const row = result.rows[0];

    res.json({
      productId: parseInt(productId),
      totalQuantitySold: row.total_quantity_sold,
      totalRevenue: row.total_revenue,
      orderCount: row.order_count,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

app.get("/api/analytics/categories/:category/revenue", async (req, res) => {
  try {
    const { category } = req.params;

    const result = await pool.query(
      "SELECT * FROM category_metrics_view WHERE category_name = $1",
      [category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const row = result.rows[0];

    res.json({
      category: category,
      totalRevenue: row.total_revenue,
      totalOrders: row.total_orders,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

app.get("/api/analytics/customers/:customerId/lifetime-value", async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await pool.query(
      "SELECT * FROM customer_ltv_view WHERE customer_id = $1",
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const row = result.rows[0];

    res.json({
      customerId: parseInt(customerId),
      totalSpent: row.total_spent,
      orderCount: row.order_count,
      lastOrderDate: row.last_order_date,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

app.get("/api/analytics/sync-status", async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT MAX(processed_at) AS last_processed FROM processed_events"
    );

    const lastProcessed = result.rows[0].last_processed;

    let lagSeconds = null;

    if (lastProcessed) {
      lagSeconds = Math.floor(
        (Date.now() - new Date(lastProcessed)) / 1000
      );
    }

    res.status(200).json({
      lastProcessedEventTimestamp: lastProcessed,
      lagSeconds: lagSeconds
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

app.listen(8081, () => {
  console.log("query running");
});