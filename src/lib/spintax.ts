export function parseSpintax(text: string): string {
  // Protect {{placeholders}} before processing spintax {a|b}
  const placeholderMap = new Map<string, string>();
  const protectedText = text.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const token = `__PH_${key}__${Math.random().toString(36).slice(2)}__`;
    placeholderMap.set(token, `{{${key}}}`);
    return token;
  });

  let result = protectedText;
  // Match {a|b|c} but not double braces (already protected) – requires at least one |
  const regex = /\{([^{}]*\|[^{}]*)\}/;
  let m: RegExpExecArray | null;
  let safety = 0;
  while ((m = regex.exec(result)) !== null && safety < 100) {
    const options = m[1].split("|");
    const choice = options[Math.floor(Math.random() * options.length)];
    result = result.slice(0, m.index) + choice + result.slice(m.index + m[0].length);
    safety++;
  }

  // Restore placeholders
  for (const [token, original] of placeholderMap.entries()) {
    result = result.split(token).join(original);
  }
  return result;
}

export function hasSpintax(text: string) {
  // Check for spintax ignoring {{placeholders}}
  const stripped = text.replace(/\{\{\w+\}\}/g, "");
  return /\{[^{}]*\|[^{}]*\}/.test(stripped);
}
