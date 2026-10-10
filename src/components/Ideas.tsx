import { ideasFor } from "../engine/ideas";
import type { HouseDesign, HouseInput } from "../engine/types";

/** An architect's first suggestions for this plot, each one you can try. */
export default function Ideas({ input, design, onApply }: { input: HouseInput; design?: HouseDesign; onApply: (p: Partial<HouseInput>) => void }) {
  const ideas = ideasFor(input, design);
  return (
    <section>
      <h2 className="text-[17px]">Ideas for this plot</h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {ideas.map((i) => (
          <li key={i.id} className="py-3.5">
            <p className="text-[14px] font-semibold text-ink">{i.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-body">{i.body}</p>
            {i.apply && <button onClick={() => onApply(i.apply!)} className="mt-2 text-[13px] font-medium text-cobalt underline-offset-2 hover:underline">Try it</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
