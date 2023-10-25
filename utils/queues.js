// import { Queue } from "bullmq";
// import moment from "moment-timezone";

// // Function to generate a random number to check
// function checkNumber() {
//   return Math.floor(Math.random() * 1000); // Change this to generate numbers within your desired range.
// }

// const targetPriceCheck = (targetNumber) => {
//   const queue = new Queue("number-checker-queue", {
//     redis: {
//       password: "ZaR6ytOhv4acwj7ArlFNtU0ohF3FAoCw",
//       host: "redis-11774.c264.ap-south-1-1.ec2.cloud.redislabs.com",
//       port: 11774,
//     },
//   });

//   const checkInterval = 60000;
//   let isQueueClosed = false; // Flag to track if the queue is closed

//   const job = queue.add("check-number", { numberToMatch: targetNumber });

//   // Calculate the closing time using moment and set it to 5:10 pm IST.
//   const closeTime = moment()
//     .tz("Asia/Kolkata") // Set the time zone to IST
//     .set({ hour: 17, minute: 14, second: 0 });

//   // Calculate the current time in IST.
//   const currentTime = moment().tz("Asia/Kolkata");

//   if (currentTime >= closeTime) {
//     // Close the queue immediately if it's past 5:14 pm IST.
//     (async () => {
//       await queue.close();
//       isQueueClosed = true; // Set the flag to indicate the queue is closed
//       console.log("Queue closed at 5:14 pm IST");
//     })();
//   }

//   const checkIntervalId = setInterval(async () => {
//     if (isQueueClosed) {
//       clearInterval(checkIntervalId); // Stop the interval if the queue is closed
//       return;
//     }

//     const numberToCheck = checkNumber();
//     const jobStatus = (await job).getState;

//     if (jobStatus === "completed") {
//       // The queue has already found a match and closed.
//       clearInterval(checkIntervalId);
//     } else if (numberToCheck === targetNumber) {
//       // Number matched, update the database, and clear the interval.
//       console.log(`Found a match: ${numberToCheck}`);
//       // Replace this section with your code to update the database.
//       clearInterval(checkIntervalId);
//     } else {
//       console.log(`Checked: ${numberToCheck}`);
//     }
//   }, checkInterval);

//   // Listen for completed jobs in the queue
//   queue.on("completed", (job) => {
//     console.log(`Job completed: ${job.returnvalue}`);
//   });

//   queue.on("closed", () => {
//     isQueueClosed = true; // Set the flag to indicate the queue is closed
//     console.log("Queue closed");
//   });
// };

// const Queues = { targetPriceCheck };

// export default Queues;

import { Queue, tryCatch } from "bullmq";
import moment from "moment-timezone";
import getStockPrice from "../utils/getStockPrice.js";

// Function to generate a random number to check
function checkNumber(num) {
  let number = 490;
  number = 490 + num;
  return number; // Change this to generate numbers within your desired range.
}

const activeProcesses = {}; // An object to store active processes and their intervals

async function targetPriceCheck(targetNumber) {
  return new Promise((resolve, reject) => {
    let num = 0;
    const interval = setInterval(() => {
      console.log(Object.keys(activeProcesses));
      num++;
      console.log(`Checking for ${targetNumber}: ${num}`);
      const numberToCheck = checkNumber(num);
      console.log(`Checking for ${targetNumber}: ${numberToCheck}`);
      if (numberToCheck === targetNumber) {
        clearInterval(interval);
        delete activeProcesses[intervalId]; // Remove the interval reference
        resolve(`Found a match for ${targetNumber}: ${numberToCheck}`);
      }
      if (num === 60) {
        clearInterval(interval);
        delete activeProcesses[intervalId]; // Remove the interval reference
        resolve(`Failed to match for ${targetNumber} at the given time`);
      }
    }, 1000);

    const intervalId = Date.now(); // Generate a unique interval ID
    activeProcesses[intervalId] = interval; // Store the interval with its ID
  });
}

// Function to initiate targetPriceCheck for a user with a specific target number
async function initiateUserCheck(targetNumber) {
  try {
    const { interval, targetNumber: userTargetNumber } = await targetPriceCheck(
      targetNumber
    );

    // You can clear the interval from anywhere in your code using its ID
    // For example, to clear the interval of the third process:
    // const thirdIntervalId = Object.keys(activeProcesses)[2];
    // clearInterval(activeProcesses[thirdIntervalId]);
  } catch (error) {
    console.error(error);
  }
}

const Queues = { initiateUserCheck };

export default Queues;
