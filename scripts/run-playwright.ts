import { spawnSync } from "node:child_process";

const LOCAL_TEST_DATABASE_URL =
  "postgresql://roomly:roomly@127.0.0.1:5433/roomly_test?schema=public";
const isWindows = process.platform === "win32";
const dockerCommand = isWindows ? "docker.exe" : "docker";
const npmCli = process.env.npm_execpath;
const requestedPaths = process.argv.slice(2);
const externalTestDatabaseUrl = process.env.TEST_DATABASE_URL;
const databaseUrl = externalTestDatabaseUrl ?? LOCAL_TEST_DATABASE_URL;

class CommandError extends Error {
  constructor(command: string, readonly exitCode: number) {
    super(`${command} failed with exit code ${exitCode}.`);
  }
}

assertTestDatabase(databaseUrl);

const testEnvironment = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_DATABASE_URL: databaseUrl,
  EMAIL_VERIFICATION_MODE: "log",
  NOTIFY_BEFORE_MINUTES: "10",
};

let failure: unknown;

try {
  if (!externalTestDatabaseUrl) {
    run(dockerCommand, [
      "compose",
      "--profile",
      "test",
      "up",
      "--detach",
      "--wait",
      "--force-recreate",
      "db-test",
    ]);
  }

  runNpm(["run", "db:deploy"], testEnvironment);
  runNpm(["run", "db:seed"], testEnvironment);
  runNpm(
    ["exec", "--", "playwright", "test", ...(requestedPaths.length ? requestedPaths : ["tests"])],
    testEnvironment,
  );
} catch (error) {
  failure = error;
} finally {
  if (!externalTestDatabaseUrl) {
    run(
      dockerCommand,
      ["compose", "--profile", "test", "rm", "--stop", "--force", "db-test"],
      process.env,
      false,
    );
  }
}

if (failure) {
  console.error(failure instanceof Error ? failure.message : failure);
  process.exitCode = failure instanceof CommandError ? failure.exitCode : 1;
}

function assertTestDatabase(connectionString: string) {
  const url = new URL(connectionString);
  if (url.pathname !== "/roomly_test") {
    throw new Error(
      `Refusing to run browser tests against non-test database: ${url.pathname}`,
    );
  }
}

function run(
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
  failOnError = true,
) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
    shell: false,
  });

  if (result.error && failOnError) throw result.error;
  if (result.status && failOnError) {
    throw new CommandError(command, result.status);
  }
}

function runNpm(args: string[], environment: NodeJS.ProcessEnv) {
  if (npmCli) {
    run(process.execPath, [npmCli, ...args], environment);
    return;
  }

  run(isWindows ? "npm.cmd" : "npm", args, environment);
}
