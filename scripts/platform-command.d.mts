export function platformCommand(command: string, platform?: NodeJS.Platform | string): string;
export function platformInvocation(
  command: string,
  args: string[],
  platform?: NodeJS.Platform | string,
  commandShell?: string
): { command: string; args: string[] };
export function pnpmInvocation(args: string[]): { command: string; args: string[] };
