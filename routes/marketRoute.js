import express from "express";
const router = express.Router();
import marketController from "../controller/marketController.js";
import verifyToken from "../utils/verifyToken.js";
const { addToWatchList, getWatchList, removeWatchListItem } = marketController;

router.post("/addtowatchlist", verifyToken, addToWatchList);
router.get("/getwatchlist/:page?", verifyToken, getWatchList);
router.delete("/removewatchlistitem/:id", verifyToken, removeWatchListItem);

export default router;
