import getStockPrice from "../utils/getStockPrice.js";
import Stock from "../models/stock.models.js";
import User from "../models/user.models.js";
import isBetween915AMAnd320PM from "../middleware/constants.js";

const activeProcesses = {};

const checkPrice = async (symbol) => {
  const data = await getStockPrice(symbol);
  return data.chart.result[0].meta.regularMarketPrice;
};

async function intradayWithoutStopLoss(data) {
  const { symbol, id, userId } = data;
  const userData = await User.findOne({ _id: userId });
  const stockData = await Stock.findById(id);

  return new Promise(async (resolve, reject) => {
    const interval = setInterval(async () => {
      const isValidTime = isBetween915AMAnd320PM();
      const price = await checkPrice(symbol);
      if (!isValidTime) {
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
      }
      if (price === stockData.stockPrice) {
        console.log(price === stockData.stockPrice);
        const totalAmount = stockData.quantity * price;
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
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Match found, db updated");
      }
    }, 60000);

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
  const userData = await User.findOne({ _id: userId });
  const stockData = await Stock.findById(id);
  let stopLossStatus = false;

  return new Promise(async (resolve, reject) => {
    const interval = setInterval(async () => {
      const price = await checkPrice(symbol);
      const isValidTime = isBetween915AMAnd320PM();
      if (!isValidTime) {
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
      }
      if (price === stockData.stockPrice && !stopLossStatus) {
        stopLossStatus = true;
      }
      if (stopLossStatus && stopLoss === price) {
        const totalAmount = stockData.quantity * price;
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
        clearInterval(interval);
        delete activeProcesses[stockData.intervalId];
        resolve("Match found, db updated");
      }
    }, 60000);

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

const Queues = { intradayWithoutStop, intradayWithStop };

export default Queues;
