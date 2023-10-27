import getStockPrice from "../utils/getStockPrice.js";
import Stock from "../models/stock.models.js";
import User from "../models/user.models.js";
import isBetween915AMAnd320PM from "../middleware/constants.js";
import isBeforeGivenDay from "./isBeforeGivenDay.js";

const activeProcesses = {};

const int = 60000;

const oneHourInterval = 10000;

const checkPrice = async (symbol) => {
  const data = await getStockPrice(symbol);
  return data.chart.result[0].meta.regularMarketPrice;
};

async function intradayWithoutStopLoss(data) {
  const { symbol, id, userId } = data;
  let matched = false;

  return new Promise(async (resolve, reject) => {
    const interval = setInterval(async () => {
      const userData = await User.findOne({ _id: userId });
      const stockData = await Stock.findById(id);
      const isValidTime = isBetween915AMAnd320PM();
      const price = await checkPrice(symbol);
      if (!isValidTime && !matched) {
        const totalAmount = stockData.totalAmount;
        await Stock.findByIdAndUpdate(id, {
          $set: {
            failed: true,
          },
        });
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet + totalAmount,
            },
          }
        );
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Match not found, db updated");
        return;
      }
      if (matched && !isValidTime) {
        const totalAmount = stockData.quantity * price;
        await Stock.findByIdAndUpdate(id, {
          $set: {
            stockPrice: price,
            netProfitAndLoss: stockData.totalAmount - totalAmount,
            squareOff: true,
            totalAmount,
            squareOffDate: new Date(),
          },
        });
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet + totalAmount,
            },
          }
        );
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Position squared off, db updated");
        return;
      }
      if (price === stockData.stockPrice && !matched) {
        const totalAmount = stockData.quantity * price;
        matched = true;
        await Stock.findByIdAndUpdate(id, {
          $set: {
            stockPrice: price,
            netProfitAndLoss: stockData.stockPrice - price,
            totalAmount,
            executed: true,
            buyDate: new Date(),
          },
        });
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
            },
          }
        );
        // clearInterval(interval);
        // delete activeProcesses[stockData.intervalId];
        resolve("Match found, db updated");
        return;
      }
    }, int);

    const intervalId = Date.now();
    activeProcesses[intervalId] = interval;

    await Stock.findByIdAndUpdate(id, {
      $set: {
        intervalId,
      },
    });

    return { intervalId };
  });
}

async function intradayWithMKT(data) {
  const { symbol, id, userId } = data;

  return new Promise(async (resolve, reject) => {
    const interval = setInterval(async () => {
      const userData = await User.findOne({ _id: userId });
      const stockData = await Stock.findById(id);
      const isValidTime = isBetween915AMAnd320PM();
      const price = await checkPrice(symbol);
      if (!stockData.squareOff) {
        if (!isValidTime) {
          const totalAmount = stockData.quantity * price;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              stockPrice: price,
              netProfitAndLoss: stockData.totalAmount - totalAmount,
              squareOff: true,
              totalAmount,
              squareOffDate: new Date(),
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet + totalAmount,
              },
            }
          );
          clearInterval(interval);
          delete activeProcesses[stockData.intervalId];
          resolve("Match not found, db updated");
          return;
        }
      } else {
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Already squared off");
        return;
      }
    }, int);

    const intervalId = Date.now();
    activeProcesses[intervalId] = interval;

    await Stock.findByIdAndUpdate(id, {
      $set: {
        intervalId,
      },
    });

    return { intervalId };
  });
}

async function intradayWithStopLoss(data) {
  const { stopLoss, symbol, id, userId } = data;
  let stopLossStatus = false;
  let matched = false;

  return new Promise(async (resolve, reject) => {
    const interval = setInterval(async () => {
      const userData = await User.findOne({ _id: userId });
      const stockData = await Stock.findById(id);
      const price = await checkPrice(symbol);
      const isValidTime = isBetween915AMAnd320PM();
      if (!isValidTime && !matched) {
        const totalAmount = stockData.totalAmount;
        await Stock.findByIdAndUpdate(id, {
          $set: {
            failed: true,
          },
        });
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet + totalAmount,
            },
          }
        );
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Match not found, db updated");
        return;
      }
      if (price === stockData.stockPrice && !stopLossStatus) {
        stopLossStatus = true;
        const totalAmount = stockData.quantity * price;
        matched = true;
        await Stock.findByIdAndUpdate(id, {
          $set: {
            stockPrice: price,
            netProfitAndLoss: stockData.stockPrice - price,
            totalAmount,
            executed: true,
            buyDate: new Date(),
          },
        });
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
            },
          }
        );
        // clearInterval(interval);
        // delete activeProcesses[stockData.intervalId];
        resolve("Match found, db updated");
        return;
      }
      if (stopLossStatus && stopLoss === price && isValidTime) {
        const totalAmount = stockData.quantity * price;
        await Stock.findByIdAndUpdate(id, {
          $set: {
            stockPrice: price,
            netProfitAndLoss: stockData.totalAmount - totalAmount,
            squareOff: true,
            totalAmount,
            squareOffDate: new Date(),
          },
        });
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet + totalAmount,
            },
          }
        );
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Position squared off, db updated");
        return;
      }
      if (stopLossStatus && !isValidTime) {
        const totalAmount = stockData.quantity * price;
        await Stock.findByIdAndUpdate(id, {
          $set: {
            stockPrice: price,
            netProfitAndLoss: stockData.totalAmount - totalAmount,
            squareOff: true,
            totalAmount,
            squareOffDate: new Date(),
          },
        });
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet + totalAmount,
            },
          }
        );
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Position squared off, db updated");
        return;
      }
    }, int);

    const intervalId = Date.now();
    activeProcesses[intervalId] = interval;

    await Stock.findByIdAndUpdate(id, {
      $set: {
        intervalId,
      },
    });

    return { intervalId };
  });
}
async function deliveryWithSL(data) {
  const { stopLoss, symbol, id, userId } = data;
  let stopLossStatus = false;
  let matched = false;

  return new Promise(async (resolve, reject) => {
    const interval = setInterval(async () => {
      const userData = await User.findOne({ _id: userId });
      const stockData = await Stock.findById(id);
      const price = await checkPrice(symbol);
      const isValidTime = isBeforeGivenDay(stockData.toSquareOffOn);
      if (!stockData.squareOff) {
        console.log("1");
        if (!isValidTime && !matched) {
          console.log("2");
          const totalAmount = stockData.totalAmount;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              failed: true,
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet + totalAmount,
              },
            }
          );
          clearInterval(interval);
          delete activeProcesses[stockData.intervalId];
          resolve("Match not found, db updated");
          return;
        }
        if (price === stockData.stockPrice && !stopLossStatus) {
          console.log("3");
          stopLossStatus = true;
          const totalAmount = stockData.quantity * price;
          matched = true;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              stockPrice: price,
              netProfitAndLoss: stockData.stockPrice - price,
              totalAmount,
              executed: true,
              buyDate: new Date(),
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet - totalAmount,
              },
            }
          );
          // clearInterval(interval);
          // delete activeProcesses[stockData.intervalId];
          resolve("Match found, db updated");
          return;
        }
        if (stopLossStatus && stopLoss === price && isValidTime) {
          console.log("4");
          const totalAmount = stockData.quantity * price;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              stockPrice: price,
              netProfitAndLoss: stockData.totalAmount - totalAmount,
              squareOff: true,
              totalAmount,
              squareOffDate: new Date(),
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet + totalAmount,
              },
            }
          );
          clearInterval(interval);
          delete activeProcesses[stockData.intervalId];
          resolve("Position squared off, db updated");
          return;
        }
        if (stopLossStatus && !isValidTime) {
          console.log("5");
          const totalAmount = stockData.quantity * price;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              stockPrice: price,
              netProfitAndLoss: stockData.totalAmount - totalAmount,
              squareOff: true,
              totalAmount,
              squareOffDate: new Date(),
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet + totalAmount,
              },
            }
          );
          clearInterval(interval);
          delete activeProcesses[stockData.intervalId];
          resolve("Position squared off, db updated");
          return;
        }
      } else {
        console.log("6");
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Already squared off");
        return;
      }
    }, oneHourInterval);

    const intervalId = Date.now();
    activeProcesses[intervalId] = interval;

    await Stock.findByIdAndUpdate(id, {
      $set: {
        intervalId,
      },
    });

    return { intervalId };
  });
}

const deliveryWithMKT = async (data) => {
  const { symbol, id, userId } = data;

  return new Promise(async (resolve, reject) => {
    const stockData = await Stock.findById(id);
    const userData = await User.findOne({ _id: userId });
    const isValidTime = isBeforeGivenDay(stockData.toSquareOffOn);
    const price = await checkPrice(symbol);
    const interval = setInterval(async () => {
      if (!stockData.squareOff) {
        if (!isValidTime) {
          const totalAmount = stockData.quantity * price;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              stockPrice: price,
              netProfitAndLoss: stockData.totalAmount - totalAmount,
              squareOff: true,
              totalAmount,
              squareOffDate: new Date(),
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet + totalAmount,
              },
            }
          );
          clearInterval(interval);
          delete activeProcesses[stockData.intervalId];
          resolve("Match not found, db updated");
          return;
        }
      } else {
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Already squared off");
        return;
      }
    }, oneHourInterval);
  });
};

const deliveryWithLMT = async (data) => {
  const { symbol, id, userId } = data;
  let matched = false;

  return new Promise(async (resolve, reject) => {
    const interval = setInterval(async () => {
      const userData = await User.findOne({ _id: userId });
      const stockData = await Stock.findById(id);
      if (!stockData.squareOff) {
        const isValidTime = isBeforeGivenDay(stockData.toSquareOffOn);
        const price = await checkPrice(symbol);
        if (!isValidTime && !matched) {
          const totalAmount = stockData.totalAmount;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              failed: true,
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet + totalAmount,
              },
            }
          );
          clearInterval(interval);
          delete activeProcesses[stockData.intervalId];
          resolve("Match not found, db updated");
          return;
        }
        if (matched && !isValidTime) {
          const totalAmount = stockData.quantity * price;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              stockPrice: price,
              netProfitAndLoss: stockData.totalAmount - totalAmount,
              squareOff: true,
              totalAmount,
              squareOffDate: new Date(),
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet + totalAmount,
              },
            }
          );
          clearInterval(interval);
          delete activeProcesses[stockData.intervalId];
          resolve("Position squared off, db updated");
          return;
        }
        if (price === stockData.stockPrice && !matched) {
          const totalAmount = stockData.quantity * price;
          matched = true;
          await Stock.findByIdAndUpdate(id, {
            $set: {
              stockPrice: price,
              netProfitAndLoss: stockData.stockPrice - price,
              totalAmount,
              executed: true,
              buyDate: new Date(),
            },
          });
          await User.findOneAndUpdate(
            { _id: userId },
            {
              $set: {
                wallet: userData.wallet - totalAmount,
              },
            }
          );
          // clearInterval(interval);
          // delete activeProcesses[stockData.intervalId];
          resolve("Match found, db updated");
          return;
        }
      } else {
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Already squared off");
        return;
      }
    }, oneHourInterval);

    const intervalId = Date.now();
    activeProcesses[intervalId] = interval;

    await Stock.findByIdAndUpdate(id, {
      $set: {
        intervalId,
      },
    });

    return { intervalId };
  });
};

const intradayWithoutStop = async (data) => {
  try {
    const result = await intradayWithoutStopLoss(data);

    console.log(result);
    // You can clear the interval from anywhere in your code using its ID
    // For example, to clear the interval of the third process:
    // clearInterval(activeProcesses[thirdIntervalId]);
  } catch (error) {
    console.error(error);
  }
};

const intradayWithStop = async (data) => {
  try {
    const result = await intradayWithStopLoss(data);

    console.log(result);
    // You can clear the interval from anywhere in your code using its ID
    // For example, to clear the interval of the third process:
    // clearInterval(activeProcesses[thirdIntervalId]);
  } catch (error) {
    console.error(error);
  }
};

const intradayMKT = async (data) => {
  try {
    const result = await intradayWithMKT(data);

    console.log(result);
    // You can clear the interval from anywhere in your code using its ID
    // For example, to clear the interval of the third process:
    // clearInterval(activeProcesses[thirdIntervalId]);
  } catch (error) {
    console.error(error);
  }
};

const deliveryMKT = async (data) => {
  try {
    const result = await deliveryWithMKT(data);

    console.log(result);
    // You can clear the interval from anywhere in your code using its ID
    // For example, to clear the interval of the third process:
    // clearInterval(activeProcesses[thirdIntervalId]);
  } catch (error) {
    console.error(error);
  }
};

const deliveryLMT = async (data) => {
  try {
    const result = await deliveryWithLMT(data);

    console.log(result);
    // You can clear the interval from anywhere in your code using its ID
    // For example, to clear the interval of the third process:
    // clearInterval(activeProcesses[thirdIntervalId]);
  } catch (error) {
    console.error(error);
  }
};
const deliverySL = async (data) => {
  try {
    const result = await deliveryWithSL(data);

    console.log(result);
    // You can clear the interval from anywhere in your code using its ID
    // For example, to clear the interval of the third process:
    // clearInterval(activeProcesses[thirdIntervalId]);
  } catch (error) {
    console.error(error);
  }
};

const Queues = {
  intradayWithoutStop,
  intradayWithStop,
  intradayMKT,
  deliveryMKT,
  deliveryLMT,
  deliverySL,
};

export default Queues;
