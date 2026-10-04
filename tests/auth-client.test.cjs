const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(file, deps = {}) {
  const name = path.resolve(file);
  const result = new Module(name, module);
  result.paths = module.paths;
  result.require = (key) => deps[key] ?? require(key);
  result._compile(
    ts.transpileModule(fs.readFileSync(name, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    name,
  );
  return result.exports;
}
const { ApiError } = load("src/lib/api.ts");
function setup(apiRequest) {
  const values = new Map([
    ["access_token", "expired"],
    ["refresh_token", "old-refresh"],
  ]);
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return {
    values,
    auth: load("src/lib/authApi.ts", { "./api": { ApiError, apiRequest } }),
  };
}
async function main() {
  let calls = 0;
  let release;
  let env = setup(async (route) => {
    if (route !== "/api/auth/refresh") throw new ApiError(401, "Expired");
    calls++;
    await new Promise((resolve) => {
      release = resolve;
    });
    throw new ApiError(401, "Revoked");
  });
  const failure = Promise.allSettled([
    env.auth.authenticatedApiRequest("/one"),
    env.auth.authenticatedApiRequest("/two"),
  ]);
  await new Promise((resolve) => setImmediate(resolve));
  release();
  const results = await Promise.race([
    failure,
    new Promise((_, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Refresh subscribers hung")),
        1000,
      );
      timeout.unref();
    }),
  ]);
  assert.equal(calls, 1);
  assert.ok(results.every((result) => result.status === "rejected"));
  assert.equal(env.values.size, 0);
  calls = 0;
  env = setup(async (route, options) => {
    if (route === "/api/auth/refresh") {
      calls++;
      await new Promise((resolve) => setImmediate(resolve));
      return { accessToken: "fresh", refreshToken: "rotated" };
    }
    if (options.token !== "fresh") throw new ApiError(401, "Expired");
    return route;
  });
  assert.deepEqual(
    await Promise.all([
      env.auth.authenticatedApiRequest("/one"),
      env.auth.authenticatedApiRequest("/two"),
    ]),
    ["/one", "/two"],
  );
  assert.equal(calls, 1);
  assert.equal(env.values.get("refresh_token"), "rotated");
  env = setup(async (route) => {
    if (route !== "/api/auth/refresh") throw new ApiError(401, "Expired");
    env.values.set("access_token", "new-login");
    env.values.set("refresh_token", "new-login-refresh");
    return { accessToken: "stale", refreshToken: "stale-refresh" };
  });
  await assert.rejects(
    env.auth.authenticatedApiRequest("/one"),
    /Сессия изменилась/,
  );
  assert.equal(env.values.get("access_token"), "new-login");
  env = setup(async () => {
    throw new ApiError(503, "Unavailable");
  });
  await assert.rejects(env.auth.authApi.refreshToken());
  assert.equal(env.values.get("refresh_token"), "old-refresh");
  console.log(
    "Auth client passed: concurrent refresh success/failure, stale response protection, transient failure preserves credentials.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
