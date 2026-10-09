/// <reference lib="webworker" />
import { generate } from "./design";
import type { HouseInput } from "./types";

self.onmessage = (e: MessageEvent<{ id: number; input: HouseInput }>) => {
  const designs = generate(e.data.input);
  (self as unknown as Worker).postMessage({ id: e.data.id, designs });
};
