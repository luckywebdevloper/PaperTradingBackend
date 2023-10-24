import Queue from "bull";

const queue = new Queue("number-checker-queue", {
  redis: { host: "127.0.0.1", port: 6379, password: "root" },
});

const closeTime = new Date();
closeTime.setUTCHours(9); // 3 pm IST
closeTime.setUTCMinutes(0);
closeTime.setUTCSeconds(0);

const currentTime = new Date();

if (currentTime >= closeTime) {
  // Close the queue if it's past 3 pm IST.
  (async () => {
    await queue.close();
    console.log("Queue closed at 3 pm IST");
  })();
}

// Listen for completed jobs in the queue
queue.on("completed", (job) => {
  console.log(`Job completed: ${job.returnvalue}`);
});

queue.on("closed", () => {
  console.log("Queue closed");
});
