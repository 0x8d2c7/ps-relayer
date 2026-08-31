import { getStore } from "@netlify/blobs";

export type DemoEvent = {
  id: string;
  event: string;
  reference?: string;
  receivedAt: string;
  signatureValid: boolean;
  targetStatus?: number;
  rawBody: string;
};

type DemoStore = {
  secretKey: string;
  targetUrl: string;
  events: DemoEvent[];
};

const STORE_NAME = "paystack-relayer";
const STATE_KEY = "state";

const globalStore = globalThis as typeof globalThis & {
  paystackDemo?: DemoStore;
};

function emptyState(): DemoStore {
  return {
    secretKey: "",
    targetUrl: "",
    events: [],
  };
}

function sharedStore() {
  try {
    return getStore({ name: STORE_NAME, consistency: "strong" });
  } catch {
    return null;
  }
}

async function readState(): Promise<DemoStore> {
  const store = sharedStore();

  if (!store) {
    globalStore.paystackDemo = globalStore.paystackDemo ?? emptyState();

    return globalStore.paystackDemo;
  }

  const state = (await store.get(STATE_KEY, {
    type: "json",
  })) as DemoStore | null;

  return state ?? emptyState();
}

async function writeState(state: DemoStore) {
  const store = sharedStore();

  if (!store) {
    globalStore.paystackDemo = state;

    return;
  }

  await store.setJSON(STATE_KEY, state);
}

export async function saveConfig(secretKey: string, targetUrl: string) {
  const state = await readState();

  state.secretKey = secretKey;
  state.targetUrl = targetUrl;

  await writeState(state);
}

export async function getConfig() {
  const state = await readState();

  return {
    secretKey: state.secretKey,
    targetUrl: state.targetUrl,
  };
}

export async function getEvents() {
  const state = await readState();

  return state.events;
}

export async function saveEvent(event: DemoEvent) {
  const state = await readState();

  state.events = [event, ...state.events].slice(0, 10);

  await writeState(state);
}

export async function clearEvents() {
  const state = await readState();

  state.events = [];

  await writeState(state);
}

export async function getEvent(id: string) {
  const state = await readState();

  return state.events.find((event) => event.id === id);
}

export async function updateTarget(id: string, targetStatus: number | undefined) {
  const state = await readState();
  const event = state.events.find((item) => item.id === id);

  if (!event) {
    return;
  }

  event.targetStatus = targetStatus;

  await writeState(state);
}
