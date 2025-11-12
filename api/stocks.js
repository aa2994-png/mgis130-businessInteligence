/**
 * Serverless function to fetch current stock prices for key technology competitors.
 * Designed for deployment on Vercel where process.env.API_KEY is securely managed.
 */
export default async function handler(req, res) {
  const companies = [
    { name: "Apple", ticker: "AAPL" },
    { name: "Microsoft", ticker: "MSFT" },
    { name: "Google", ticker: "GOOGL" },
    { name: "Meta", ticker: "META" },
    { name: "Amazon", ticker: "AMZN" },
  ];

  try {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing API configuration. Please set the API_KEY environment variable.",
      });
    }

    const requests = companies.map(async ({ name, ticker }) => {
      const endpoint = `https://api.api-ninjas.com/v1/stockprice?ticker=${encodeURIComponent(
        ticker
      )}`;

      const response = await fetch(endpoint, {
        headers: {
          "X-Api-Key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch stock price for ${ticker}: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data) && !data?.price) {
        throw new Error(`Unexpected response format for ${ticker}.`);
      }

      // API Ninjas returns an array when multiple tickers are supplied or an object for single.
      const stockRecord = Array.isArray(data) ? data[0] : data;

      return {
        ticker,
        company: name,
        currentPrice: Number.parseFloat(stockRecord.price),
        timestamp:
          stockRecord.timestamp
            ? new Date(stockRecord.timestamp * 1000).toISOString()
            : new Date().toISOString(),
      };
    });

    const stocks = await Promise.all(requests);

    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      stocks,
    });
  } catch (error) {
    console.error("Stock API fetch failed:", error);
    return res.status(500).json({
      error: "Unable to retrieve stock data at this time.",
      details: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
