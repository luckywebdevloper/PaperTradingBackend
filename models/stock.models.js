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
      type: String,
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
    deliveryType: {
      type: String,
      default: null,
      enum: ["DELIVERY", "INTRADAY"],
    },
    quantity: {
      type: Number,
      default: 0,
    },
    triggerPrice: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("stock", watchListSchema);
