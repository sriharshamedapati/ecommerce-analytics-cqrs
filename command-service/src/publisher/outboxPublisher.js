const amqp = require("amqplib");
const pool = require("../config/db");

async function startPublisher() {

    const connection = await amqp.connect("amqp://broker");
    const channel = await connection.createChannel();

    const QUEUE = "order-events";

    await channel.assertQueue(QUEUE);

    console.log("Outbox publisher started");

    setInterval(async () => {

        const client = await pool.connect();

        try {

            const result = await client.query(
                "SELECT * FROM outbox WHERE published_at IS NULL LIMIT 10"
            );

            for (const row of result.rows) {

                channel.sendToQueue(
                    QUEUE,
                    Buffer.from(JSON.stringify(row.payload)),
                    {
                        messageId: row.id,
                        persistent: true
                    }
                );

                await client.query(
                    "UPDATE outbox SET published_at = NOW() WHERE id=$1",
                    [row.id]
                );

                console.log("Event published:", row.id);
            }

        } catch(err) {
            console.log(err);
        } finally {
            client.release();
        }

    }, 3000);
}

module.exports = startPublisher;