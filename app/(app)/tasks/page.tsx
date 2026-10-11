import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TasksIcon } from "@/components/icons";
import { TaskList } from "@/components/task-list";
import { getCategories, getTaskPage } from "@/lib/data";
import { todayStr } from "@/lib/dates";

export const metadata: Metadata = { title: "Tasks" };

function parsePage(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [result, categories] = await Promise.all([getTaskPage(page), getCategories()]);
  if (page > result.pageCount) redirect(`/tasks?page=${result.pageCount}`);

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={<TasksIcon className="size-6.5" />}
        title="All tasks"
        description={result.total === 0 ? "Nothing planned yet" : `${result.total} task${result.total === 1 ? "" : "s"}, newest first`}
      />
      <TaskList key={page} result={result} categories={categories} today={todayStr()} />
    </div>
  );
}
