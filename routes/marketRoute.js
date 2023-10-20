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
  sell,
} = marketController;

router.post("/addtowatchlist", verifyToken, addToWatchList);
router.get("/getwatchlist/:page?", verifyToken, getWatchList);
router.delete("/removewatchlistitem/:id", verifyToken, removeWatchListItem);
router.post("/buy", verifyToken, buy);
router.get("/getmystocks/:type?", verifyToken, getMyStocks);
router.post("/sell", verifyToken, sell);

export default router;
