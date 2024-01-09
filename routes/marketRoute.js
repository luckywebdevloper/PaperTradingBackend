import express from "express";
const router = express.Router();
import marketController from "../controller/marketController.js";
import verifyToken from "../utils/verifyToken.js";
const {
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
} = marketController;

router.post("/addtowatchlist", verifyToken, addToWatchList);
router.get("/getwatchlist/:page?", verifyToken, getWatchList);
router.delete("/removewatchlistitem/:symbol", verifyToken, removeWatchListItem);
router.post("/buy", verifyToken, buy);
router.get("/getmystocks/:type?", verifyToken, getMyStocks);
router.post("/squareoff", verifyToken, squareOff);
router.get("/getmystockhistory", verifyToken, getMyStockHistory);
router.post("/sell", verifyToken, sell);
router.delete("/deletestock/:id", verifyToken, deleteStock);
router.post("/decodestockdata", decodeStockData);

export default router;
