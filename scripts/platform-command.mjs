export function platformCommand(command, platform = process.platform) {
  return platform === "win32" && ["npm", "npx", "pnpm", "yarn"].includes(command) ? `${command}.cmd` : command;
}

export function platformInvocation(command, args, platform = process.platform, commandShell = process.env.ComSpec) {
  if (platform === "win32" && ["npm", "npx", "pnpm", "yarn"].includes(command)) {
    return {
      command: commandShell || "cmd.exe",
      args: ["/d", "/s", "/c", platformCommand(command, platform), ...args]
    };
  }
  return { command, args };
}

export function pnpmInvocation(args) {
  return platformInvocation("pnpm", args);
}
