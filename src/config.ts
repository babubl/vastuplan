export const config = { askUrl: (import.meta.env.VITE_ASK_URL as string | undefined)?.replace(/\/$/, "") };
export const aiEnabled = Boolean(config.askUrl);
