const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const path = require("node:path");
const filename = path.resolve("src/lib/eventRequirements.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { validateEventDetails, subtractCalendar, contentListDeadline } =
  loaded.exports;
const now = new Date("2026-09-05T10:00:00Z");
const base = {
  requestType: "coverage",
  organization: "Совет факультета",
  representativeName: "Иван Иванов",
  representativeContacts: "@example",
  sessions: [
    {
      startTime: "2026-09-19T09:00:00Z",
      endTime: "2026-09-19T15:00:00Z",
      location: "Актовый зал",
    },
  ],
  scenario: "Открытие, интервью, концерт",
  participants: "5–10 человек",
  crew: {
    videoEngineer: 0,
    operator: 0,
    editor: 0,
    sound: 0,
    photographer: 0,
    lighting: 0,
  },
  contentIdea: "",
  contentList: "",
  deliveryDeadline: "",
  rulesAccepted: true,
};
const errors = (data) => validateEventDetails(data, now).errors;
assert.deepEqual(errors(base), {});
assert.ok(
  errors({
    ...base,
    sessions: [{ ...base.sessions[0], startTime: "2026-09-18T09:00:00Z" }],
  })["sessions.0.startTime"],
);
assert.ok(errors({ ...base, organization: "   " }).organization);
assert.ok(errors({ ...base, rulesAccepted: false }).rulesAccepted);
assert.ok(
  errors({
    ...base,
    sessions: [{ ...base.sessions[0], endTime: "2026-09-19T08:00:00Z" }],
  })["sessions.0.endTime"],
);
assert.ok(
  errors({ ...base, sessions: [{ ...base.sessions[0], location: "" }] })[
    "sessions.0.location"
  ],
);
assert.deepEqual(
  errors({ ...base, requestType: "content", deliveryDeadline: "2026-09-26" }),
  {},
);
assert.ok(
  errors({ ...base, requestType: "content", deliveryDeadline: "2026-09-25" })
    .deliveryDeadline,
);
assert.ok(
  errors({ ...base, requestType: "content", deliveryDeadline: "2026-02-30" })
    .deliveryDeadline,
);
assert.ok(
  errors({ ...base, requestType: "combined", deliveryDeadline: "2026-09-25" })
    .deliveryDeadline,
);
assert.ok(
  errors({
    ...base,
    requestType: "content",
    deliveryDeadline: "2026-09-26",
    sessions: [{ ...base.sessions[0], endTime: "2026-09-27T12:00:00Z" }],
  }).deliveryDeadline,
);
assert.deepEqual(
  errors({
    ...base,
    sessions: [
      ...base.sessions,
      {
        startTime: "2026-09-21T08:00:00Z",
        endTime: "2026-09-21T12:00:00Z",
        location: "Парк",
      },
    ],
  }),
  {},
);
const trip = {
  ...base,
  requestType: "trip",
  scenario: "",
  participants: "",
  sessions: [
    {
      startTime: "2026-11-05T08:00:00Z",
      endTime: "2026-11-07T16:00:00Z",
      location: "Залучье",
    },
  ],
  contentIdea: "Репортаж, фото участников, трансляция на кулисы",
  crew: { ...base.crew, operator: 2 },
};
assert.deepEqual(errors(trip), {});
assert.equal(contentListDeadline(trip), "2026-10-05");
assert.ok(errors({ ...trip, crew: base.crew }).crew);
assert.ok(
  errors({
    ...trip,
    sessions: [{ ...trip.sessions[0], startTime: "2026-11-04T08:00:00Z" }],
  })["sessions.0.startTime"],
);
assert.equal(subtractCalendar("2026-04-30", 2, "months"), "2026-02-28");
assert.equal(subtractCalendar("2028-03-31", 1, "months"), "2028-02-29");
assert.equal(subtractCalendar("2026-01-31", 2, "months"), "2025-11-30");
assert.deepEqual(errors(null).requestType, undefined); // malformed root is rejected, never throws
assert.ok(Object.keys(errors(null)).length);
assert.ok(
  errors({ ...base, crew: { ...base.crew, operator: -1 } })["crew.operator"],
);
console.log("Event requirements: 23 assertions passed");
