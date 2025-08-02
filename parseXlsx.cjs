const XLSX = require("xlsx");
const { startOfDay } = require("date-fns/startOfDay");
const { isSameDay } = require("date-fns/isSameDay");
const fs = require("fs-extra");

const CLOSED_POSITION_HISTORY = "CLOSED POSITION HISTORY";
const CASH_OPERATION_HISTORY = "CASH OPERATION HISTORY";
const OPEN_POSITION = "OPEN POSITION";
const STOCK_OPEN = "stockOpen";
const STOCK_CLOSE = "stockClose";

// Pomocnicza funkcja do pobierania indeksów kolumn po nagłówkach
function getHeaderKeys(headerRow, wantedKeys) {
  const map = {};
  for (const wantedKey of wantedKeys) {
    map[wantedKey] = Object.keys(headerRow).find((key) => headerRow[key] === wantedKey);
  }
  return map;
}

function parseXLSXDate(dateStr) {
  const dateObjectParsed = XLSX.SSF.parse_date_code(dateStr);
  return new Date(
    dateObjectParsed.y,
    dateObjectParsed.m - 1,
    dateObjectParsed.d,
    dateObjectParsed.H || 0,
    dateObjectParsed.M || 0,
    dateObjectParsed.S || 0,
  );
}

function symbolToYahooSuffix(symbol) {
  if (symbol.endsWith(".UK")) {
    return ".L";
  }
  if (symbol.endsWith(".US")) {
    return "";
  }
  return symbol.split(".").at(-1);
}

async function getStocksValue(stocks, date) {
  let stocksValue = 0;

  const pricesResponses = await Promise.allSettled(
    Object.keys(stocks).map((symbol) => fetchStockClosePrice(symbol.split(".")[0] + symbolToYahooSuffix(symbol), date)),
  );

  const closePrices = pricesResponses.reduce((acc, res, idx) => {
    if (res.status === "fulfilled" && res.value !== null) {
      acc[Object.keys(stocks)[idx]] = res.value;
    }
    return acc;
  }, {});

  for (const symbol in stocks) {
    const closePrice = closePrices[symbol] || null;
    if (closePrice !== null) {
      stocksValue += closePrice * stocks[symbol];
    }
  }

  return stocksValue;
}

/**
 * Funkcja parsuje arkusz i śledzi wartość gotówki oraz akcji w czasie.
 * Zwraca tablicę obiektów { date, cash, stocks } posortowaną rosnąco po dacie.
 */
function getCashAndStocksTimeline(filePath) {
  const workbook = XLSX.readFile(filePath);
  // Parsowanie historii operacji gotówkowych
  const cashSheet = workbook.Sheets[CASH_OPERATION_HISTORY];
  const cashData = XLSX.utils.sheet_to_json(cashSheet);

  // Parsowanie historii otwartych pozycji (akcje)
  const openSheet = workbook.Sheets[Object.keys(workbook.Sheets).find((key) => key.startsWith(OPEN_POSITION))];
  const openData = XLSX.utils.sheet_to_json(openSheet);

  // Parsowanie historii zamkniętych pozycji (akcje)
  const closedSheet = workbook.Sheets[CLOSED_POSITION_HISTORY];
  const closedData = XLSX.utils.sheet_to_json(closedSheet);

  // CASH: szukamy nagłówków
  const cashHeaderIdx = cashData.findIndex((row) => Object.values(row).includes("Time"));
  const cashHeaders = cashData[cashHeaderIdx];
  const cashKeys = getHeaderKeys(cashHeaders, ["Time", "Amount"]);

  // STOCKS: szukamy nagłówków
  const openStocksHeaderIdx = openData.findIndex((row) => Object.values(row).includes("Open time"));
  const openStocksHeaders = openData[openStocksHeaderIdx];
  const openStocksKeys = getHeaderKeys(openStocksHeaders, ["Open time", "Volume", "Purchase value", "Symbol"]);

  const closedStocksHeaderIdx = closedData.findIndex((row) => Object.values(row).includes("Close time"));
  const closedStocksHeaders = closedData[closedStocksHeaderIdx];
  const closedStocksKeys = getHeaderKeys(closedStocksHeaders, [
    "Close time",
    "Open time",
    "Volume",
    "Purchase value",
    "Sale value",
    "Symbol",
  ]);

  // Zbierz wszystkie operacje gotówkowe
  const cashEvents = cashData
    .slice(cashHeaderIdx + 1)
    .filter((row) => row[cashKeys["Time"]])
    .map((row) => ({
      date: parseXLSXDate(row[cashKeys["Time"]]),
      cashChange: parseFloat(row[cashKeys["Amount"]]) || 0,
      type: "cash",
    }));

  // Zbierz wszystkie otwarcia pozycji (akcje)
  const stockOpenEvents = openData
    .slice(openStocksHeaderIdx + 1)
    .filter((row) => row[openStocksKeys["Open time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[openStocksKeys["Open time"]]),
        stocksVolumeChange: volume,
        type: STOCK_OPEN,
        stockSymbol: row[openStocksKeys["Symbol"]] || null, // symbol akcji, jeśli dostępny
      };
    });

  // Zbierz wszystkie otwarcia zamkniętych pozycji (akcje)
  const closedStocksOpenEvents = closedData
    .slice(closedStocksHeaderIdx + 1)
    .filter((row) => row[closedStocksKeys["Open time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[closedStocksKeys["Open time"]]),
        stocksVolumeChange: volume,
        type: STOCK_OPEN,
        stockSymbol: row[closedStocksKeys["Symbol"]] || null, // symbol akcji, jeśli dostępny
      };
    });

  // Zbierz wszystkie zamknięcia pozycji (akcje)
  const closedStocksCloseEvents = closedData
    .slice(closedStocksHeaderIdx + 1)
    .filter((row) => row[closedStocksKeys["Close time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[closedStocksKeys["Close time"]]),
        stocksVolumeChange: volume,
        type: STOCK_CLOSE,
        stockSymbol: row[closedStocksKeys["Symbol"]] || null, // symbol akcji, jeśli dostępny
      };
    });

  // Połącz i posortuj wszystkie zdarzenia po dacie
  const allEvents = [...cashEvents, ...stockOpenEvents, ...closedStocksOpenEvents, ...closedStocksCloseEvents].toSorted(
    (a, b) => a.date - b.date,
  );

  // Przechowuj wartości w czasie
  let cash = 0;
  let stocks = {};
  const timeline = [];
  for (const event of allEvents) {
    if (event.type === "cash") {
      cash += event.cashChange;
    } else if (event.type === STOCK_OPEN) {
      if (!stocks[event.stockSymbol]) {
        stocks[event.stockSymbol] = 0;
      }
      stocks[event.stockSymbol] += event.stocksVolumeChange;
    } else if (event.type === STOCK_CLOSE) {
      if (stocks[event.stockSymbol]) {
        stocks[event.stockSymbol] -= event.stocksVolumeChange;
        if (stocks[event.stockSymbol] <= 0) {
          delete stocks[event.stockSymbol]; // Usuń, jeśli nie ma już akcji
        }
      }
    }
    timeline.push({
      date: event.date,
      cash,
      stocks: JSON.parse(JSON.stringify(stocks)),
    });
  }
  return timeline;
}

/**
 * Funkcja pomocnicza do pobierania kursu zamknięcia akcji z Yahoo Finance (lub innego API)
 * @param {string} symbol - symbol akcji, np. SMCI
 * @param {string} dateStr - data w formacie YYYY-MM-DD
 * @returns {Promise<number|null>} - kurs zamknięcia lub null jeśli brak danych
 */
async function fetchStockClosePrice(symbol, date) {
  // Yahoo Finance API (nieoficjalny endpoint)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(startOfDay(date).getTime() / 1000)}&period2=${Math.floor(startOfDay(date).getTime() / 1000) + 60 * 60 * 24}&interval=1d`;
  console.log("Fetching stock close price for: ", symbol, " on date: ", date.toISOString(), " from URL: ", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    });
    const data = await res.json();
    const close = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0];
    return close || null;
  } catch (e) {
    return null;
  }
}

/**
 * Funkcja generuje tablicę dat od daty początkowej do końcowej (włącznie)
 */
function getDateRange(start, end) {
  const arr = [];
  let dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

/**
 * Główna funkcja: dla każdego dnia pobiera kurs zamknięcia i liczy wartość portfela
 */
async function getPortfolioValueTimeline(filePath) {
  const timeline = getCashAndStocksTimeline(filePath);
  if (!timeline.length) return [];

  // Zakres dat
  const firstDate = timeline[0].date;
  const lastDate = timeline[timeline.length - 1].date;
  const allDates = getDateRange(firstDate, lastDate);

  // Dla każdej daty znajdź stan portfela (cash, stocks) i pobierz kurs zamknięcia
  const result = [];
  for (const day of allDates) {
    // Znajdź wydarzenia na ten dzień
    const dayEvents = timeline.filter((t) => isSameDay(t.date, day));

    if (dayEvents.length === 0) {
      const previousState = result.at(-1);
      if (!previousState) {
        continue;
      }

      result.push({
        date: day,
        cash: previousState.cash,
        stocks: previousState.stocks,
        portfolioValue:
          previousState.cash +
          ((await getStocksValue(previousState.stocks, day)) ||
            (Object.keys(previousState.stocks).length ? previousState.portfolioValue - previousState.cash : 0)), // Take stocks value from previous day if present in case the yahoo API returns 0 due to weekend.
      });
    } else {
      const finalState = dayEvents.at(-1);

      result.push({
        date: day,
        cash: finalState.cash,
        stocks: finalState.stocks,
        portfolioValue:
          finalState.cash +
          ((await getStocksValue(finalState.stocks, day)) ||
            (Object.keys(finalState.stocks).length && result.at(-1)?.portfolioValue
              ? (result.at(-1).portfolioValue ?? 0 - result.at(-1).cash)
              : 0)),
      });
    }
  }
  return result;
}

(async () => {
  const portfolioTimeline = await getPortfolioValueTimeline("./Test spreadsheet.xlsx");
  console.dir(portfolioTimeline);
  fs.writeJsonSync("./dist/portfolioTimeline.json", portfolioTimeline, { spaces: 2 });
})();
