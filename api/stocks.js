import { request as httpsRequest } from "node:https";

/**
 * Serverless function to fetch current stock prices for key technology competitors.
 * Designed for deployment on Vercel where process.env.API_KEY is securely managed.
 */
const COMPANIES = [
  { name: "Apple", ticker: "AAPL" },
  { name: "Microsoft", ticker: "MSFT" },
  { name: "Google", ticker: "GOOGL" },
  { name: "Meta", ticker: "META" },
  { name: "Amazon", ticker: "AMZN" },
];

const API_BASE_URL = "https://api.api-ninjas.com/v1/stockprice";
const REQUEST_TIMEOUT_MS = 8000;
const AUTH_ERROR_STATUSES = new Set([401, 403]);

/**
 * Normalize timestamps returned by the external API to ISO strings.
 * @param {number|string|undefined|null} value
 */
function normalizeTimestamp(value) {
  if (value == null) {
    return new Date().toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // API Ninjas returns Unix seconds. Convert to milliseconds when appropriate.
    const timestamp = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(timestamp).toISOString();
  }

  const parsed = Date.parse(String(value));
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

function httpGetJson(url, { headers, timeout }) {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(url, { method: "GET", headers }, (response) => {
      const { statusCode = 0 } = response;
      let raw = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });

      response.on("end", () => {
        if (statusCode < 200 || statusCode >= 300) {
          const error = new Error(
            `Request failed with status ${statusCode}${
              raw ? `: ${raw.slice(0, 200)}` : ""
            }`
          );
          error.statusCode = statusCode;
          error.body = raw;
          return reject(error);
        }

        try {
          const parsed = raw.length ? JSON.parse(raw) : null;
          resolve(parsed);
        } catch (parseError) {
          const error = new Error("Unable to parse API response.");
          error.cause = parseError;
          error.body = raw;
          reject(error);
        }
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.setTimeout(timeout, () => {
      request.destroy(new Error(`Request timed out after ${timeout}ms`));
    });

    request.end();
  });
}

async function fetchStockForCompany({ name, ticker }, apiKey) {
  const endpointUrl = new URL(API_BASE_URL);
  endpointUrl.searchParams.set("ticker", ticker);

  const data = await httpGetJson(endpointUrl, {
    headers: {
      "X-Api-Key": apiKey,
      Accept: "application/json",
      "User-Agent": "competitive-intel-dashboard/1.0",
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const stockRecord = Array.isArray(data) ? data[0] : data;

  if (!stockRecord || stockRecord.price == null) {
    throw new Error("Unexpected response payload");
  }

  const price = Number.parseFloat(stockRecord.price);
  if (Number.isNaN(price)) {
    throw new Error("Received non-numeric price value");
  }

  return {
    ticker,
    company: name,
    currentPrice: price,
    timestamp: normalizeTimestamp(
      stockRecord.timestamp ?? stockRecord.updated_at ?? stockRecord.datetime
    ),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey =
    process.env.API_KEY ??
    process.env.API_NINJAS_KEY ??
    process.env.STOCKS_API_KEY ??
    process.env.API_NINJAS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing API configuration. Please set the API_KEY environment variable.",
    });
  }

  try {
    const results = await Promise.allSettled(
      COMPANIES.map((company) => fetchStockForCompany(company, apiKey))
    );

    const stocks = [];
    const errors = [];

    results.forEach((result, index) => {
      const company = COMPANIES[index];

      if (result.status === "fulfilled") {
        stocks.push(result.value);
      } else {
        const reason =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        const statusCode =
          result.reason && typeof result.reason.statusCode === "number"
            ? result.reason.statusCode
            : undefined;
        errors.push({
          ticker: company.ticker,
          company: company.name,
          statusCode,
          message: reason,
        });
      }
    });

    const responseBase = {
      updatedAt: new Date().toISOString(),
      stocks,
    };

    res.setHeader("Cache-Control", "no-store, max-age=0");

    if (!stocks.length) {
      const everyAuthError =
        errors.length > 0 &&
        errors.every((entry) =>
          entry.statusCode ? AUTH_ERROR_STATUSES.has(entry.statusCode) : false
        );

      return res
        .status(everyAuthError ? 401 : 502)
        .json({
          ...responseBase,
          error: everyAuthError
            ? "Authentication with the upstream stock provider failed. Verify the configured API key."
            : "Unable to retrieve stock data at this time.",
          errors,
        });
    }

    if (errors.length) {
      return res.status(206).json({ ...responseBase, errors });
    }

    return res.status(200).json(responseBase);
  } catch (error) {
    console.error("Stock API fetch failed:", error);
    const isDev = process.env.NODE_ENV === "development";

    return res.status(error?.statusCode ?? 500).json({
      error: "Unable to retrieve stock data at this time.",
      details: isDev ? String(error) : undefined,
      errors:
        error && typeof error === "object" && "details" in error ? error.details : undefined,
    });
  }
}
