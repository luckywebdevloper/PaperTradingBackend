import express from "express";
const router = express.Router();
import userController from "../controller/userController.js";
import verifyToken from "../utils/verifyToken.js";
const { register, sendOtp, verifyOtp, getUserProfile, login } = userController;

router.post("/register", register);
router.post("/sendotp", verifyToken, sendOtp);
router.post("/verifyotp", verifyToken, verifyOtp);
router.get("/getuserprofile", verifyToken, getUserProfile);
router.post("/login", login);

export default router;
