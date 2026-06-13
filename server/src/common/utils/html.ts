const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Escape user-controlled text before embedding it in HTML (e.g. email bodies).
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
}
