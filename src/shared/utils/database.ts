import { promises as fs } from "fs";
import path from "path";
import type {
  User,
  Portfolio,
  Stock,
  Holding,
  DividendRecord,
  Transaction,
  ExchangeRate,
  DividendGoal,
} from "@/shared/types";

// JSON 파일 경로들
const DATA_DIR = path.join(process.cwd(), "src", "shared", "data", "schemas");

const getFilePath = (entity: string) => path.join(DATA_DIR, `${entity}.json`);

// 제네릭 데이터베이스 작업 함수들
async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}

// 유틸리티 함수들
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// 사용자 관리
export async function getUsers(): Promise<User[]> {
  const data = await readJsonFile<{ users: User[] }>(getFilePath("users"));
  return data.users;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((user) => user.id === id) || null;
}

export async function createUser(
  userData: Omit<User, "id" | "createdAt" | "updatedAt">,
): Promise<User> {
  const users = await getUsers();
  const newUser: User = {
    ...userData,
    id: generateId(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  users.push(newUser);
  await writeJsonFile(getFilePath("users"), { users });
  return newUser;
}

export async function updateUser(
  id: string,
  updates: Partial<User>,
): Promise<User | null> {
  const users = await getUsers();
  const userIndex = users.findIndex((user) => user.id === id);

  if (userIndex === -1) return null;

  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: getCurrentTimestamp(),
  };

  await writeJsonFile(getFilePath("users"), { users });
  return users[userIndex];
}

// 포트폴리오 관리
export async function getPortfolios(): Promise<Portfolio[]> {
  const data = await readJsonFile<{ portfolios: Portfolio[] }>(
    getFilePath("portfolios"),
  );
  return data.portfolios;
}

export async function getPortfoliosByUserId(
  userId: string,
): Promise<Portfolio[]> {
  const portfolios = await getPortfolios();
  return portfolios.filter((portfolio) => portfolio.userId === userId);
}

export async function getPortfolioById(id: string): Promise<Portfolio | null> {
  const portfolios = await getPortfolios();
  return portfolios.find((portfolio) => portfolio.id === id) || null;
}

export async function createPortfolio(
  portfolioData: Omit<Portfolio, "id" | "createdAt" | "updatedAt">,
): Promise<Portfolio> {
  const portfolios = await getPortfolios();
  const newPortfolio: Portfolio = {
    ...portfolioData,
    id: generateId(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  portfolios.push(newPortfolio);
  await writeJsonFile(getFilePath("portfolios"), { portfolios });
  return newPortfolio;
}

// 주식 관리
export async function getStocks(): Promise<Stock[]> {
  const data = await readJsonFile<{ stocks: Stock[] }>(getFilePath("stocks"));
  return data.stocks;
}

export async function getStockById(id: string): Promise<Stock | null> {
  const stocks = await getStocks();
  return stocks.find((stock) => stock.id === id) || null;
}

export async function getStockByTicker(ticker: string): Promise<Stock | null> {
  const stocks = await getStocks();
  return (
    stocks.find(
      (stock) => stock.ticker.toLowerCase() === ticker.toLowerCase(),
    ) || null
  );
}

export async function createStock(
  stockData: Omit<Stock, "id" | "createdAt" | "updatedAt">,
): Promise<Stock> {
  const stocks = await getStocks();
  const newStock: Stock = {
    ...stockData,
    id: generateId(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  stocks.push(newStock);
  await writeJsonFile(getFilePath("stocks"), { stocks });
  return newStock;
}

export async function updateStock(
  id: string,
  updates: Partial<Stock>,
): Promise<Stock | null> {
  const stocks = await getStocks();
  const stockIndex = stocks.findIndex((stock) => stock.id === id);

  if (stockIndex === -1) return null;

  stocks[stockIndex] = {
    ...stocks[stockIndex],
    ...updates,
    updatedAt: getCurrentTimestamp(),
  };

  await writeJsonFile(getFilePath("stocks"), { stocks });
  return stocks[stockIndex];
}

// 보유종목 관리
export async function getHoldings(): Promise<Holding[]> {
  const data = await readJsonFile<{ holdings: Holding[] }>(
    getFilePath("holdings"),
  );
  return data.holdings;
}

export async function getHoldingsByPortfolioId(
  portfolioId: string,
): Promise<Holding[]> {
  const holdings = await getHoldings();
  return holdings.filter((holding) => holding.portfolioId === portfolioId);
}

export async function getHoldingById(id: string): Promise<Holding | null> {
  const holdings = await getHoldings();
  return holdings.find((holding) => holding.id === id) || null;
}

export async function createHolding(
  holdingData: Omit<Holding, "id" | "createdAt" | "updatedAt">,
): Promise<Holding> {
  const holdings = await getHoldings();
  const newHolding: Holding = {
    ...holdingData,
    id: generateId(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  holdings.push(newHolding);
  await writeJsonFile(getFilePath("holdings"), { holdings });
  return newHolding;
}

export async function updateHolding(
  id: string,
  updates: Partial<Holding>,
): Promise<Holding | null> {
  const holdings = await getHoldings();
  const holdingIndex = holdings.findIndex((holding) => holding.id === id);

  if (holdingIndex === -1) return null;

  holdings[holdingIndex] = {
    ...holdings[holdingIndex],
    ...updates,
    updatedAt: getCurrentTimestamp(),
  };

  await writeJsonFile(getFilePath("holdings"), { holdings });
  return holdings[holdingIndex];
}

export async function deleteHolding(id: string): Promise<boolean> {
  const holdings = await getHoldings();
  const filteredHoldings = holdings.filter((holding) => holding.id !== id);

  if (filteredHoldings.length === holdings.length) return false;

  await writeJsonFile(getFilePath("holdings"), { holdings: filteredHoldings });
  return true;
}

// 배당 기록 관리
export async function getDividendRecords(): Promise<DividendRecord[]> {
  const data = await readJsonFile<{ dividendRecords: DividendRecord[] }>(
    getFilePath("dividend-records"),
  );
  return data.dividendRecords;
}

export async function getDividendRecordsByHoldingId(
  holdingId: string,
): Promise<DividendRecord[]> {
  const records = await getDividendRecords();
  return records.filter((record) => record.holdingId === holdingId);
}

export async function createDividendRecord(
  recordData: Omit<DividendRecord, "id" | "createdAt" | "updatedAt">,
): Promise<DividendRecord> {
  const records = await getDividendRecords();
  const newRecord: DividendRecord = {
    ...recordData,
    id: generateId(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  records.push(newRecord);
  await writeJsonFile(getFilePath("dividend-records"), {
    dividendRecords: records,
  });
  return newRecord;
}

// 거래 기록 관리
export async function getTransactions(): Promise<Transaction[]> {
  const data = await readJsonFile<{ transactions: Transaction[] }>(
    getFilePath("transactions"),
  );
  return data.transactions;
}

export async function getTransactionsByPortfolioId(
  portfolioId: string,
): Promise<Transaction[]> {
  const transactions = await getTransactions();
  return transactions.filter(
    (transaction) => transaction.portfolioId === portfolioId,
  );
}

export async function createTransaction(
  transactionData: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
): Promise<Transaction> {
  const transactions = await getTransactions();
  const newTransaction: Transaction = {
    ...transactionData,
    id: generateId(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  transactions.push(newTransaction);
  await writeJsonFile(getFilePath("transactions"), { transactions });
  return newTransaction;
}

// 환율 관리
export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const data = await readJsonFile<{ exchangeRates: ExchangeRate[] }>(
    getFilePath("exchange-rates"),
  );
  return data.exchangeRates;
}

export async function getLatestExchangeRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<ExchangeRate | null> {
  const rates = await getExchangeRates();
  const filteredRates = rates.filter(
    (rate) =>
      rate.fromCurrency === fromCurrency && rate.toCurrency === toCurrency,
  );

  if (filteredRates.length === 0) return null;

  return filteredRates.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0];
}

export async function createExchangeRate(
  rateData: Omit<ExchangeRate, "id">,
): Promise<ExchangeRate> {
  const rates = await getExchangeRates();
  const newRate: ExchangeRate = {
    ...rateData,
    id: generateId(),
  };

  rates.push(newRate);
  await writeJsonFile(getFilePath("exchange-rates"), { exchangeRates: rates });
  return newRate;
}

// 배당 목표 관리
export async function getDividendGoals(): Promise<DividendGoal[]> {
  const data = await readJsonFile<{ dividendGoals: DividendGoal[] }>(
    getFilePath("dividend-goals"),
  );
  return data.dividendGoals;
}

export async function getDividendGoalsByUserId(
  userId: string,
): Promise<DividendGoal[]> {
  const goals = await getDividendGoals();
  return goals.filter((goal) => goal.userId === userId);
}

export async function createDividendGoal(
  goalData: Omit<DividendGoal, "id" | "createdAt" | "updatedAt">,
): Promise<DividendGoal> {
  const goals = await getDividendGoals();
  const newGoal: DividendGoal = {
    ...goalData,
    id: generateId(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  goals.push(newGoal);
  await writeJsonFile(getFilePath("dividend-goals"), { dividendGoals: goals });
  return newGoal;
}

