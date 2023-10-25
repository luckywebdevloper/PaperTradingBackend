import axios from "axios";

const getStockPrice = (symbol) => {
  return new Promise(async (resolve, reject) => {
    try {
      const config = {
        // url: `https://www.nseindia.com/api/quote-equity?symbol=${symbol}`,
        url: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`,
        // headers: {
        //   "Accept-Language": "en-US,en;q=0.9",
        //   "Accept-Encoding": "gzip, deflate, br",
        //   Connection: "keep-alive",
        // },
      };

      const response = await axios.get(config);
      resolve(response);
    } catch (error) {
      reject(error);
    }
  });
};

export default getStockPrice;
