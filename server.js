import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import "./db.js";
import user from "./routes/userRoute.js";
import morgan from "morgan";

dotenv.config();

const app = express();

app.use(express.json());

app.use(morgan("tiny"));

morgan.token("host", function (req, res) {
  return req.hostname;
});

app.use(cors());

const port = process.env.PORT;

app.use("/user", user);

app.listen(port, () => console.log(`server listening on port ${port}`));
