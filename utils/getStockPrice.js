import fetch from "node-fetch";

const getStockPrice = (symbol) => {
  return new Promise(async (resolve, reject) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      // const url = `https://www.nseindia.com/api/quote-equity?symbol=${symbol}`;

      const response = await fetch(url);

      const data = await response.json();
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

export default getStockPrice;
