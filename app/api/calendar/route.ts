import { initDb } from "@/lib/db";
import { getTasks } from "@/lib/db/queries";
import { withErrorHandling, withRateLimit } from "@/lib/api/handler";

function generateICal(tasks: Awaited<ReturnType<typeof getTasks>>, calendarName: string): string {
  const ics: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Todo Dola//Seed 2 Pro//EN",
    `X-WR-CALNAME:${calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const task of tasks) {
    if (!task.date && !task.deadline) continue;
    const dt = task.date ?? task.deadline;
    if (dt === null) continue;
    const dtStart = new Date(dt);
    const uid = `${task.id}@todo-dola.local`;

    ics.push("BEGIN:VEVENT");
    ics.push(`UID:${uid}`);
    ics.push(`DTSTART:${formatDate(dtStart)}`);
    if (task.deadline && task.deadline !== task.date) {
      const dtEnd = new Date(task.deadline);
      ics.push(`DUE:${formatDate(dtEnd)}`);
    }
    ics.push(`STATUS:${task.completed ? "COMPLETED" : "NEEDS-ACTION"}`);
    const importance: Record<string, string> = { high: "1", medium: "2", low: "3", none: "0" };
    ics.push(`PRIORITY:${importance[task.priority] || "0"}`);
    ics.push(`SUMMARY:${escapeICalText(task.name)}`);
    if (task.description) ics.push(`DESCRIPTION:${escapeICalText(task.description)}`);
    ics.push(`LOCATION:${escapeICalText(task.listId || "")}`);
    if (task.labels && task.labels.length > 0) {
      ics.push(`CATEGORIES:${task.labels.map(l => l.name).join(",")}`);
    }
    ics.push("TZID:UTC");
    ics.push("END:VEVENT");
  }
  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "ical";
  const calendarName = searchParams.get("name") || "Todo Dola Tasks";
  const view = searchParams.get("view") || "all";
  const completed = searchParams.get("completed") === "true" ? true : searchParams.get("completed") === "false" ? false : undefined;
  const tasks = await getTasks({ view: view as any, completed });
  if (format === "json") return Response.json({ data: tasks });
  return new Response(generateICal(tasks, calendarName), {
    headers: { "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH", "Content-Disposition": "attachment; filename=tasks.ics" },
  });
}));
