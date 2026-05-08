export function sleep(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
