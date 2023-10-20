import express from "express";
const router = express.Router();
import marketController from "../controller/marketController.js";
import verifyToken from "../utils/verifyToken.js";
const { addToWatchList, getWatchList, removeWatchListItem, buy } =
  marketController;

router.post("/addtowatchlist", verifyToken, addToWatchList);
router.get("/getwatchlist/:page?", verifyToken, getWatchList);
router.delete("/removewatchlistitem/:id", verifyToken, removeWatchListItem);
router.post("/buy/", verifyToken, buy);

export default router;
