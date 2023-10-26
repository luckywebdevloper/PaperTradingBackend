import mongoose from "mongoose";
const Schema = mongoose.Schema;

const watchListSchema = new Schema(
  {
    stockName: {
      type: String,
      default: null,
    },
    symbol: {
      type: String,
      default: null,
    },
    totalAmount: {
      type: Number,
      default: null,
    },
    stockType: {
      type: String,
      default: null,
      enum: ["MKT", "LMT", "SL", "SL - M"],
    },
    userId: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      default: null,
      enum: ["DELIVERY", "INTRADAY"],
    },
    quantity: {
      type: Number,
      default: 0,
    },
    targetPrice: {
      type: Number,
      default: null,
    },
    stockPrice: {
      type: Number,
      default: null,
    },
    stopLoss: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      default: null,
      enum: ["BUY", "SELL"],
    },
    netProfitAndLoss: {
      type: Number,
      default: null,
    },
    soldDate: {
      type: Date,
      default: null,
    },
    buyDate: {
      type: Date,
      default: null,
    },
    squareOff: {
      type: Boolean,
      default: false,
    },
    squareOffDate: {
      type: Date,
      default: null,
    },
    intervalId: {
      type: String,
      default: null,
    },
    executed: {
      type: Boolean,
      default: false,
    },
    failed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("stock", watchListSchema);
