import { NextResponse } from "next/server";
import {
  getCurrentDateTime,
  getExchangeRate,
  getHolidays,
  getWeatherForCity,
} from "@/app/lib/agentTools";

const MAX_STEPS = 3;

export async function GET() {
  const now = getCurrentDateTime();
  const [weather, eur, usd, holidays] = await Promise.all([
    getWeatherForCity("Warszawa"),
    getExchangeRate("EUR"),
    getExchangeRate("USD"),
    getHolidays("PL", new Date().getFullYear()),
  ]);

  const upcomingHolidays = Array.isArray(holidays.holidays)
    ? holidays.holidays.slice(0, 5)
    : [];

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    datetime: now,
    weather,
    currencies: { EUR: eur, USD: usd },
    upcomingHolidays,
  });
}
