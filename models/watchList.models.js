import mongoose from "mongoose";
const Schema = mongoose.Schema;

const watchListSchema = new Schema(
  {
    symbol: {
      type: String,
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("watchlist", watchListSchema);
