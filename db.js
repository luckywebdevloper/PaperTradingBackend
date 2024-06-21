import mongoose from "mongoose";
mongoose
  .connect(
    "mongodb+srv://mobiartlucky:Xmv02441!@tradingapp.dpv9zgj.mongodb.net/",
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
