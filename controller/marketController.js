import watchList from "../models/watchList.models.js";
import User from "../models/user.models.js";
import responseHelper from "../helpers/response.helper.js";
import { MESSAGE } from "../helpers/message.helper.js";
import Stock from "../models/stock.models.js";
import Queues from "../utils/queues.js";
import { nseData } from "nse-data";
import { getLTP } from "nse-quotes-api";
import getStockPrice from "../utils/getStockPrice.js";
import isBetween915AMAnd320PM from "../middleware/constants.js";
const { send200, send201, send403, send400, send401, send404, send500 } =
  responseHelper;

const addToWatchList = async (req, res) => {
  const { symbol } = req.body;
  const userId = req.user._id;

  try {
    if (!symbol) {
      return send400(res, {
        status: false,
        message: MESSAGE.SYMBOL_EMPTY,
      });
    }
    const alreadyAdded = await watchList.findOne({ userId, symbol });
    if (alreadyAdded) {
      return send400(res, {
        status: false,
        message: MESSAGE.SYMBOL_ALREADY_EXISTS,
      });
    }
    const addWatchList = new watchList({
      symbol,
      userId,
    });
    const data = await addWatchList.save();
    return send201(res, {
      status: true,
      message: MESSAGE.SYMBOL_ADDED,
      data,
    });
  } catch (error) {
    return send400(res, {
      status: false,
      message: error.message,
    });
  }
};

const getWatchList = async (req, res) => {
  const userId = req.user._id;
  const page = req.params.page || 1;
  const itemsPerPage = 10;

  try {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return send404(res, {
        status: false,
        message: MESSAGE.USER_NOT_FOUND,
      });
    }

    const skip = (page - 1) * itemsPerPage;
    const limit = itemsPerPage;

    const watchListData = await watchList
      .find({ userId })
      .skip(skip)
      .limit(limit);

    return send200(res, {
      status: true,
      message: MESSAGE.WATCH_LIST_DATA,
      data: watchListData || [],
    });
  } catch (error) {
    return send400(res, {
      status: false,
      message: error.message,
    });
  }
};

const removeWatchListItem = async (req, res) => {
  const userId = req.user._id;
  const itemId = req.params.id;
  try {
    const watchListData = await watchList.findOne({ userId, _id: itemId });
    if (!watchListData) {
      return send400(res, {
        status: false,
        message: MESSAGE.SYMBOL_NOT_FOUND,
      });
    }
    await watchList.findOneAndDelete({ userId, _id: itemId });
    return send200(res, {
      status: true,
      message: MESSAGE.SYMBOL_REMOVED,
    });
  } catch (error) {
    return send400(res, {
      status: false,
      message: error.message,
    });
  }
};

const buy = async (req, res) => {
  const {
    stockName,
    symbol,
    totalAmount,
    stockType,
    type,
    quantity,
    stockPrice,
    stopLoss,
  } = req.body;
  const userId = req.user._id;
  try {
    if (
      !(
        stockName ||
        symbol ||
        totalAmount ||
        stockType ||
        type ||
        quantity ||
        stockPrice ||
        stopLoss
      )
    ) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }
    const isValidTime = isBetween915AMAnd320PM();
    const userData = await User.findOne({ _id: userId });
    if (type === "INTRADAY") {
      if (!isValidTime) {
        return send400(res, {
          status: false,
          message: MESSAGE.ITRADAY_ERROR,
        });
      }
      if (stockType === "LMT") {
        const newStock = new Stock({
          stockName,
          symbol,
          totalAmount,
          stockType,
          type,
          quantity,
          userId,
          stockPrice,
          buyDate: new Date(),
          status: "BUY",
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.intradayWithoutStop(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      }
      if (stockType === "SL") {
        const newStock = new Stock({
          stockName,
          symbol,
          totalAmount,
          stockType,
          type,
          quantity,
          userId,
          stockPrice,
          buyDate: new Date(),
          status: "BUY",
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId, stopLoss };
        Queues.intradayWithStop(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      }
    }
    await User.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          wallet: userData.wallet - totalAmount,
        },
      }
    );
    const newStock = new Stock({
      stockName,
      symbol,
      totalAmount,
      stockType,
      type,
      quantity,
      targetPrice,
      userId,
      stockPrice,
      buyDate: new Date(),
      status: "BUY",
      stopLoss,
    });
    const data = await newStock.save();
    return send201(res, {
      status: true,
      message: MESSAGE.BOUGHT_STOCK,
      data,
    });
  } catch (error) {
    return send400(res, {
      status: false,
      message: error.message,
    });
  }
};

const squareOff = async (req, res) => {
  const { stockId, totalAmount, stockPrice } = req.body;
  const userId = req.user._id;
  try {
    if (!(stockId || totalAmount || stockPrice)) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }
    const stockData = await Stock.findOne({ _id: stockId });
    // if (stockData.quantity < quantity) {
    //   return send400(res, {
    //     status: false,
    //     message: MESSAGE.QUANTITY_ERROR,
    //   });
    // }
    if (stockData.squareOff) {
      return send400(res, {
        status: false,
        message: MESSAGE.ALREADY_SQUARED,
      });
    }
    const userData = await User.findOne({ _id: userId });
    await User.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          wallet: userData.wallet + totalAmount,
        },
      }
    );
    await Stock.findOneAndUpdate(
      { _id: stockId },
      {
        $set: {
          // quantity: stockData.quantity - quantity,
          stockPrice,
          netProfitAndLoss: stockData.stockPrice - stockPrice,
          squareOff: true,
          totalAmount,
          squareOffDate: new Date(),
        },
      }
    );
    // const newStock = new Stock({
    //   stockName: stockData.stockName,
    //   symbol: stockData.symbol,
    //   totalAmount: totalAmount,
    //   stockType: stockData.stockType,
    //   type: stockData.type,
    //   quantity: quantity,
    //   targetPrice: stockData.targetPrice,
    //   userId,
    //   stockPrice,
    //   soldDate: new Date(),
    //   status: "SELL",
    //   buyDate: stockData.buyDate,
    // });
    // await newStock.save();
    return send200(res, {
      status: true,
      message: MESSAGE.STOCK_SQUARE_OFF,
    });
  } catch (error) {
    return send400(res, {
      status: false,
      message: error.message,
    });
  }
};

const getMyStocks = async (req, res) => {
  const userId = req.user._id;
  // const page = req.params.page || 1;
  // const itemsPerPage = 10;
  const type = req.params.type;

  try {
    const StocksData = await Stock.find({ userId });
    let data = [];
    data = StocksData;
    if (type === "pending") {
      data = StocksData.filter((stock) => !stock.executed && !stock.squareOff);
    }
    if (type === "executed" || type === "trades") {
      data = StocksData.filter((stock) => stock.executed && !stock.squareOff);
    }
    if (type === "failed") {
      data = StocksData.filter((stock) => stock.failed && !stock.squareOff);
    }
    return send200(res, {
      status: true,
      message: MESSAGE.USER_STOCK_DATA,
      data,
    });
  } catch (error) {
    return send400(res, {
      status: false,
      message: error.message,
    });
  }
};

const getMyStockHistory = async (req, res) => {
  const userId = req.user._id;
  // const page = req.params.page || 1;
  // const itemsPerPage = 10;
  // const type = req.params.type

  try {
    const data = await Stock.find({ userId, squareOff: true });
    return send200(res, {
      status: true,
      message: MESSAGE.USER_STOCK_DATA,
      data,
    });
  } catch (error) {
    return send400(res, {
      status: false,
      message: error.message,
    });
  }
};

const getStockDataTest = async (req, res) => {
  const { id } = req.body;
  try {
    const stockData = await Stock.findOne({ _id: id });
    Queues.initiateUserCheck({
      stopLoss: stockData.stockPrice,
      symbol: stockData.symbol,
      id,
      userId: stockData.userId,
    });
    return send200(res, {
      status: true,
      message: "Queue running",
    });
  } catch (error) {
    return send400(res, {
      status: false,
      error: error,
    });
  }
};

const marketController = {
  addToWatchList,
  getWatchList,
  removeWatchListItem,
  buy,
  getMyStocks,
  squareOff,
  getMyStockHistory,
  getStockDataTest,
};

export default marketController;
