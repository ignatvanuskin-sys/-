export function renderPlaceholders(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}

export function extractPlaceholders(text: string): string[] {
  const matches = [...text.matchAll(/\{\{(\w+)\}\}/g)];
  return matches.map((m) => m[1]);
}

export function extractUrls(text: string): string[] {
  const matches = [...text.matchAll(/https?:\/\/[^\s"'<>]+/g)];
  return matches.map((m) => m[0]);
}
