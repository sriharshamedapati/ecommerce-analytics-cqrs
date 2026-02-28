const amqp = require("amqplib");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.READ_DATABASE_URL,
});

async function startConsumer() {
  const connection = await amqp.connect(process.env.BROKER_URL);
  const channel = await connection.createChannel();

  const queue = "order-events";

  await channel.assertQueue(queue, { durable: true });

  console.log("consumer running");

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const eventId = msg.properties.messageId;

      // Idempotency check
      const existing = await client.query(
        "SELECT 1 FROM processed_events WHERE event_id = $1",
        [eventId]
      );

      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        channel.ack(msg);
        return;
      }

      if (event.eventType === "ProductCreated") {

        const { productId, name, category, price, stock } = event;

        await client.query(`
            INSERT INTO products(id, name, category, price, stock)
            VALUES($1,$2,$3,$4,$5)
            ON CONFLICT (id) DO NOTHING
        `, [
            productId,
            name,
            category,
            price,
            stock
        ]);
    }

      if (event.eventType === "OrderCreated") {
        const { customerId, items, total, timestamp } = event;

        // ===== PRODUCT SALES + CATEGORY METRICS =====
        for (const item of items) {

          // Product Sales View
          await client.query(`
            INSERT INTO product_sales_view(product_id, total_quantity_sold, total_revenue, order_count)
            VALUES($1, $2, $3, 1)
            ON CONFLICT (product_id)
            DO UPDATE SET
              total_quantity_sold = product_sales_view.total_quantity_sold + $2,
              total_revenue = product_sales_view.total_revenue + $3,
              order_count = product_sales_view.order_count + 1
          `, [
            item.productId,
            item.quantity,
            item.quantity * item.price
          ]);

          // Get category from products table
          const productResult = await client.query(
            "SELECT category FROM products WHERE id = $1",
            [item.productId]
          );

          if (productResult.rows.length > 0) {
            const category = productResult.rows[0].category;

            // Category Metrics View
            await client.query(`
              INSERT INTO category_metrics_view(category_name, total_revenue, total_orders)
              VALUES($1, $2, 1)
              ON CONFLICT (category_name)
              DO UPDATE SET
                total_revenue = category_metrics_view.total_revenue + $2,
                total_orders = category_metrics_view.total_orders + 1
            `, [
              category,
              item.quantity * item.price
            ]);
          }
        }

        // ===== CUSTOMER LTV =====
        await client.query(`
          INSERT INTO customer_ltv_view(customer_id, total_spent, order_count, last_order_date)
          VALUES($1, $2, 1, $3)
          ON CONFLICT (customer_id)
          DO UPDATE SET
            total_spent = customer_ltv_view.total_spent + $2,
            order_count = customer_ltv_view.order_count + 1,
            last_order_date = $3
        `, [
          customerId,
          total,
          timestamp
        ]);

        // ===== HOURLY SALES =====
        const hour = new Date(timestamp);
        hour.setMinutes(0, 0, 0);

        await client.query(`
          INSERT INTO hourly_sales_view(hour_timestamp, total_orders, total_revenue)
          VALUES($1, 1, $2)
          ON CONFLICT (hour_timestamp)
          DO UPDATE SET
            total_orders = hourly_sales_view.total_orders + 1,
            total_revenue = hourly_sales_view.total_revenue + $2
        `, [
          hour,
          total
        ]);
      }

      // Mark event processed
      await client.query(
        "INSERT INTO processed_events(event_id) VALUES($1)",
        [eventId]
      );

      await client.query("COMMIT");

      channel.ack(msg);
      console.log("Read model updated");

    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
    } finally {
      client.release();
    }
  });
}

startConsumer();