import type { Metadata } from "next";
import { MonthCalendarView } from "@/components/month-calendar";
import { getMonthCalendar, isMonthStr } from "@/lib/calendar";
import { todayStr } from "@/lib/dates";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const { month: monthParam } = await searchParams;
  const today = todayStr();
  const month = isMonthStr(monthParam) ? monthParam : today.slice(0, 7);
  const cal = await getMonthCalendar(month);
  return <MonthCalendarView cal={cal} today={today} />;
}
