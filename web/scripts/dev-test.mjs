import { spawn } from "node:child_process";
const child = spawn(process.execPath, ["--import", "./scripts/sites-env.mjs", "./node_modules/vite/bin/vite.js", "--port", "3001", "--strictPort"], {
  stdio: "inherit", env: { ...process.env, MZ_TEST: "1" },
});
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
