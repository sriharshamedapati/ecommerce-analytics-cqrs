const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createOrder = async (req, res) => {
  const { customerId, items } = req.body;

  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let total = 0;

    // Check stock and calculate total
    for (const item of items) {
      const productResult = await client.query(
        "SELECT stock, price FROM products WHERE id = $1 FOR UPDATE",
        [item.productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error("Product not found");
      }

      const product = productResult.rows[0];

      if (product.stock < item.quantity) {
        throw new Error("Insufficient stock");
      }

      total += item.quantity * item.price;

      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [item.quantity, item.productId]
      );
    }

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders(customer_id, total, status)
       VALUES($1,$2,$3) RETURNING id`,
      [customerId, total, "CREATED"]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items(order_id, product_id, quantity, price)
         VALUES($1,$2,$3,$4)`,
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    // Insert OrderCreated event into outbox
    await client.query(
      `INSERT INTO outbox(id, topic, payload)
       VALUES($1,$2,$3)`,
      [
        uuidv4(),
        "order-events",
        JSON.stringify({
          eventType: "OrderCreated",
          orderId,
          customerId,
          items,
          total,
          timestamp: new Date().toISOString()
        })
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({ orderId });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};