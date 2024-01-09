import getStockPrice from "./getStockPrice.js";

const checkPrice = async (symbol) => {
  const data = await getStockPrice(symbol);
  return data.chart.result[0].meta.regularMarketPrice;
};

export default checkPrice;
