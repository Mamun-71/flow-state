import type { Metadata } from "next";
import { DayHeader } from "@/components/day-header";
import { TaskBoard } from "@/components/task-board";
import { getCategories, getDayBoard } from "@/lib/data";
import { isDateStr, todayStr } from "@/lib/dates";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const { date: dateParam } = await searchParams;
  const today = todayStr();
  const date = isDateStr(dateParam) ? dateParam : today;

  const [board, categories] = await Promise.all([getDayBoard(date, date === today), getCategories()]);

  return (
    <>
      <DayHeader
        date={date}
        today={today}
        trackedSeconds={board.trackedSeconds}
        runningSince={board.runningSince}
        runningCountedSeconds={board.runningCountedSeconds}
        plannedMinutes={board.plannedMinutes}
      />
      <TaskBoard key={date} date={date} today={today} tasks={board.tasks} carriedOver={board.carriedOver} categories={categories} />
    </>
  );
}
