import mongoose from "mongoose";
mongoose
  .connect(
    "mongodb+srv://luckyneo:Xmv02441!@papertrading.vttwau1.mongodb.net/",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then((data) => {
    console.log("Database Connected");
  })
  .catch((err) => {
    console.log("err", err);
  });
