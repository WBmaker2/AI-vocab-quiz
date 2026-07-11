import test from "node:test";
import assert from "node:assert/strict";

const capabilityModulePromise = import("./studentProfileCapability.js").catch(
  () => null,
);

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

async function loadCapabilityModule() {
  const capabilityModule = await capabilityModulePromise;
  assert.ok(capabilityModule, "student profile capability module should be available");
  return capabilityModule;
}

test("getOrCreateStudentProfileCapability keeps a stable token for one profile scope", async () => {
  const {
    getOrCreateStudentProfileCapability,
  } = await loadCapabilityModule();
  const storage = createMemoryStorage();
  const scope = {
    schoolId: "school-1",
    grade: "3",
    studentName: "민수",
  };

  const first = getOrCreateStudentProfileCapability({
    ...scope,
    storage,
    createToken: () => "0123456789abcdef0123456789abcdef",
  });
  const second = getOrCreateStudentProfileCapability({
    ...scope,
    storage,
    createToken: () => "fedcba9876543210fedcba9876543210",
  });

  assert.equal(first, "0123456789abcdef0123456789abcdef");
  assert.equal(second, first);
});

test("getOrCreateStudentProfileCapability separates school, grade, and name scopes", async () => {
  const {
    getOrCreateStudentProfileCapability,
  } = await loadCapabilityModule();
  const storage = createMemoryStorage();
  const tokens = [
    "0123456789abcdef0123456789abcdef",
    "11111111111111111111111111111111",
    "22222222222222222222222222222222",
    "33333333333333333333333333333333",
  ];
  let index = 0;
  const createToken = () => tokens[index++];

  const results = [
    { schoolId: "school-1", grade: "3", studentName: "민수" },
    { schoolId: "school-2", grade: "3", studentName: "민수" },
    { schoolId: "school-1", grade: "4", studentName: "민수" },
    { schoolId: "school-1", grade: "3", studentName: "지민" },
  ].map((scope) =>
    getOrCreateStudentProfileCapability({ ...scope, storage, createToken }),
  );

  assert.deepEqual(results, tokens);
});

test("isStudentProfileCapabilityToken requires exactly 32 lowercase hexadecimal characters", async () => {
  const {
    isStudentProfileCapabilityToken,
  } = await loadCapabilityModule();

  assert.equal(
    isStudentProfileCapabilityToken("0123456789abcdef0123456789abcdef"),
    true,
  );
  assert.equal(isStudentProfileCapabilityToken("0123456789abcdef0123456789abcde"), false);
  assert.equal(isStudentProfileCapabilityToken("0123456789abcdef0123456789abcdefg"), false);
  assert.equal(isStudentProfileCapabilityToken("0123456789ABCDEF0123456789ABCDEF"), false);
});

test("getOrCreateStudentProfileCapability replaces corrupt stored data", async () => {
  const {
    STUDENT_PROFILE_CAPABILITY_STORAGE_KEY,
    findStudentProfileCapability,
    getOrCreateStudentProfileCapability,
  } = await loadCapabilityModule();
  const storage = createMemoryStorage({
    [STUDENT_PROFILE_CAPABILITY_STORAGE_KEY]: "not-json",
  });
  const scope = { schoolId: "school-1", grade: "3", studentName: "민수" };

  assert.equal(findStudentProfileCapability({ ...scope, storage }), null);
  assert.equal(
    getOrCreateStudentProfileCapability({
      ...scope,
      storage,
      createToken: () => "0123456789abcdef0123456789abcdef",
    }),
    "0123456789abcdef0123456789abcdef",
  );
  assert.doesNotThrow(() => JSON.parse(storage.getItem(STUDENT_PROFILE_CAPABILITY_STORAGE_KEY)));
});

test("student profile capability lookup safely returns null when storage is unavailable", async () => {
  const {
    findStudentProfileCapability,
    getOrCreateStudentProfileCapability,
  } = await loadCapabilityModule();
  const unavailableStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  const scope = { schoolId: "school-1", grade: "3", studentName: "민수" };

  assert.equal(findStudentProfileCapability({ ...scope, storage: unavailableStorage }), null);
  assert.equal(
    getOrCreateStudentProfileCapability({
      ...scope,
      storage: unavailableStorage,
      createToken: () => "0123456789abcdef0123456789abcdef",
    }),
    null,
  );
});

test("createStudentProfileCapabilityToken uses injected crypto randomness deterministically", async () => {
  const {
    createStudentProfileCapabilityToken,
  } = await loadCapabilityModule();
  const crypto = {
    getRandomValues(bytes) {
      bytes.set(Array.from({ length: bytes.length }, (_, index) => index));
      return bytes;
    },
  };

  assert.equal(
    createStudentProfileCapabilityToken({ crypto }),
    "000102030405060708090a0b0c0d0e0f",
  );
});
