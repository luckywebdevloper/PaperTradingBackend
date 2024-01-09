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
import next5DayDate from "../utils/next5DayDate.js";
import { Buffer } from "buffer";
import { fileURLToPath } from "url";
import { dirname } from "path";
import protobuf from "protobufjs";

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
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};

const getWatchList = async (req, res) => {
  const userId = req?.user?._id;
  const page = req?.params?.page;
  const itemsPerPage = 10;

  try {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return send404(res, {
        status: false,
        message: MESSAGE.USER_NOT_FOUND,
      });
    }

    if (page) {
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
    } else {
      const watchListData = await watchList.find({ userId });
      return send200(res, {
        status: true,
        message: MESSAGE.WATCH_LIST_DATA,
        data: watchListData || [],
      });
    }
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};

const removeWatchListItem = async (req, res) => {
  const userId = req.user._id;
  const symbol = req.params.symbol;
  try {
    const watchListData = await watchList.findOne({ userId, symbol });
    if (!watchListData) {
      return send400(res, {
        status: false,
        message: MESSAGE.SYMBOL_NOT_FOUND,
      });
    }
    await watchList.findOneAndDelete({ userId, symbol });
    return send200(res, {
      status: true,
      message: MESSAGE.SYMBOL_REMOVED,
    });
  } catch (error) {
    return send500(res, {
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
      !stockName ||
      !symbol ||
      !totalAmount ||
      !stockType ||
      !type ||
      !quantity ||
      !stockPrice
    ) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }
    if (stockType === "SL" && !stopLoss) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }

    const isValidTime = isBetween915AMAnd320PM();
    const userData = await User.findOne({ _id: userId });
    if (totalAmount > userData.wallet) {
      return send400(res, {
        status: false,
        message: MESSAGE.INSUFFICIENT_FUNDS,
      });
    }
    if (type === "INTRADAY") {
      if (!isValidTime) {
        return send400(res, {
          status: false,
          message: MESSAGE.ITRADAY_ERROR,
        });
      }
      if (stockType === "MKT") {
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
          executed: true,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.intradayMKT(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
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
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.intradayLMT(checkData);
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
          stopLoss,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId, stopLoss };
        Queues.intradaySL(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      } else {
        return send400(res, {
          status: true,
          message: MESSAGE.INVALID_STOCK_TYPE,
        });
      }
    } else {
      if (stockType === "MKT") {
        const nextDate = next5DayDate(new Date());
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
          executed: true,
          toSquareOffOn: nextDate,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.deliveryMKT(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      }
      if (stockType === "LMT") {
        const nextDate = next5DayDate(new Date());
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
          toSquareOffOn: nextDate,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.deliveryLMT(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      }
      if (stockType === "SL") {
        const nextDate = next5DayDate(new Date());
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
          stopLoss,
          toSquareOffOn: nextDate,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId, stopLoss };
        Queues.deliverySL(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      } else {
        return send400(res, {
          status: true,
          message: MESSAGE.INVALID_TYPE,
        });
      }
    }
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};

const sell = async (req, res) => {
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
      !stockName ||
      !symbol ||
      !totalAmount ||
      !stockType ||
      !type ||
      !quantity ||
      !stockPrice
    ) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }
    if (stockType === "SL" && !stopLoss) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }
    if (type !== "INTRADAY") {
      return send400(res, {
        status: false,
        message: MESSAGE.SELL_ERROR,
      });
    }

    const isValidTime = isBetween915AMAnd320PM();
    const userData = await User.findOne({ _id: userId });
    if (totalAmount > userData.wallet) {
      return send400(res, {
        status: false,
        message: MESSAGE.INSUFFICIENT_FUNDS,
      });
    }
    if (type === "INTRADAY") {
      if (!isValidTime) {
        return send400(res, {
          status: false,
          message: MESSAGE.ITRADAY_ERROR,
        });
      }
      if (stockType === "MKT") {
        const newStock = new Stock({
          stockName,
          symbol,
          totalAmount,
          stockType,
          type,
          quantity,
          userId,
          stockPrice,
          soldDate: new Date(),
          status: "SELL",
          executed: true,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.intradayMKT(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
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
          soldDate: new Date(),
          status: "SELL",
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.intradayLMT(checkData);
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
          soldDate: new Date(),
          status: "SELL",
          stopLoss,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId, stopLoss };
        Queues.intradaySL(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      } else {
        return send400(res, {
          status: true,
          message: MESSAGE.INVALID_STOCK_TYPE,
        });
      }
    } else {
      if (stockType === "MKT") {
        const nextDate = next5DayDate(new Date());
        const newStock = new Stock({
          stockName,
          symbol,
          totalAmount,
          stockType,
          type,
          quantity,
          userId,
          stockPrice,
          soldDate: new Date(),
          status: "SELL",
          executed: true,
          toSquareOffOn: nextDate,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.deliveryMKT(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      }
      if (stockType === "LMT") {
        const nextDate = next5DayDate(new Date());
        const newStock = new Stock({
          stockName,
          symbol,
          totalAmount,
          stockType,
          type,
          quantity,
          userId,
          stockPrice,
          soldDate: new Date(),
          status: "SELL",
          toSquareOffOn: nextDate,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId };
        Queues.deliveryLMT(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      }
      if (stockType === "SL") {
        const nextDate = next5DayDate(new Date());
        const newStock = new Stock({
          stockName,
          symbol,
          totalAmount,
          stockType,
          type,
          quantity,
          userId,
          stockPrice,
          soldDate: new Date(),
          status: "SELL",
          stopLoss,
          toSquareOffOn: nextDate,
        });
        const data = await newStock.save();
        await User.findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              wallet: userData.wallet - totalAmount,
              totalInvested: userData.totalInvested + totalAmount,
            },
          }
        );
        const checkData = { symbol, id: data._id, userId, stopLoss };
        Queues.deliverySL(checkData);
        return send200(res, {
          status: true,
          message: MESSAGE.ADDED_IN_QUEUE,
          data,
        });
      } else {
        return send400(res, {
          status: true,
          message: MESSAGE.INVALID_TYPE,
        });
      }
    }
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};

const squareOff = async (req, res) => {
  const { stockId, totalAmount, stockPrice } = req.body;
  const userId = req.user._id;
  try {
    const isValidTime = isBetween915AMAnd320PM();
    if (!stockId || !totalAmount || !stockPrice) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }
    const stockData = await Stock.findOne({ _id: stockId });
    if (stockData.squareOff) {
      return send400(res, {
        status: false,
        message: MESSAGE.ALREADY_SQUARED,
      });
    }
    if (!stockData.executed) {
      return send400(res, {
        status: false,
        message: MESSAGE.NOT_EXECUTED,
      });
    }
    if (stockData.type === "INTRADAY" && !isValidTime) {
      return send400(res, {
        status: false,
        message: MESSAGE.OUT_OF_TIME_SQUARE,
      });
    }
    if (stockData.failed) {
      return send400(res, {
        status: false,
        message: MESSAGE.INVALID_STOCK,
      });
    }
    const userData = await User.findOne({ _id: userId });
    await Stock.findOneAndUpdate(
      { _id: stockId },
      {
        $set: {
          stockPrice,
          netProfitAndLoss: stockData.totalAmount - totalAmount,
          squareOff: true,
          totalAmount,
          squareOffDate: new Date(),
        },
      }
    );
    await User.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          wallet: userData.wallet + totalAmount,
          totalInvested: userData.totalInvested + totalAmount,
        },
      }
    );
    return send200(res, {
      status: true,
      message: MESSAGE.STOCK_SQUARE_OFF,
    });
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};

const getMyStocks = async (req, res) => {
  const userId = req.user._id;
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
    if (type === "others") {
      data = StocksData.filter((stock) => stock.failed && !stock.squareOff);
    }
    return send200(res, {
      status: true,
      message: MESSAGE.USER_STOCK_DATA,
      data,
    });
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};

const getMyStockHistory = async (req, res) => {
  const userId = req.user._id;

  try {
    const data = await Stock.find({ userId, squareOff: true });
    return send200(res, {
      status: true,
      message: MESSAGE.USER_STOCK_DATA,
      data,
    });
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};
const decodeStockData = async (req, res) => {
  const stockData = req.body.stockData;

  try {
    const currentModuleURL = import.meta.url;
    const currentModulePath = fileURLToPath(currentModuleURL);
    const root = protobuf.loadSync(
      dirname(currentModulePath) + "/YPricingData.proto"
    );
    const Yaticker = root.lookupType("yaticker");
    const data = Yaticker.decode(new Buffer(stockData, "base64"));
    return send200(res, {
      status: true,
      message: MESSAGE.DECODED_DATA,
      data,
    });
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
    });
  }
};

const deleteStock = async (req, res) => {
  const userId = req.user._id;
  const itemId = req.params.id;
  try {
    if (!itemId) {
      return send400(res, {
        status: false,
        message: MESSAGE.FIELDS_REQUIRED,
      });
    }
    const userData = await User.findOne({ _id: userId });
    const StockData = await Stock.findOne({ userId, _id: itemId });
    if (!StockData) {
      return send400(res, {
        status: false,
        message: MESSAGE.STOCK_NOT_FOUND,
      });
    }
    if (Stock.executed || Stock.squareOff) {
      return send400(res, {
        status: false,
        message: MESSAGE.INVALID_STOCK_STATUS,
      });
    }
    await User.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          wallet: userData.wallet + StockData.totalAmount,
        },
      }
    );
    await Stock.findOneAndDelete({ userId, _id: itemId });
    return send200(res, {
      status: true,
      message: MESSAGE.STOCK_DELETED,
    });
  } catch (error) {
    return send500(res, {
      status: false,
      message: error.message,
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
  sell,
  decodeStockData,
  deleteStock,
};

export default marketController;
