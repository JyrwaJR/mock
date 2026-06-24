import type { ZodIssue } from 'zod';

export function formatZodIssues(issues: ZodIssue[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const issue of issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(issue.message);
  }

  return grouped;
}
