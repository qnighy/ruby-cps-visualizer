import { ReactElement, useMemo } from "react";
import { usePrism } from "./prism";

export type VisualizerProps = {
  code: string;
};

export function Visualizer(props: VisualizerProps): ReactElement | null {
  const { code } = props;
  const parse = usePrism();
  const parseResult = useMemo(() => parse(code), [code, parse]);
  console.log(parseResult);
  return (
    <div
      className="w-full flex flex-row items-stretch justify-stretch justify-items-stretch bg-gray-100 mt-6"
    >
      <pre
        className="flex-1 basis-1/2 min-h-64 overflow-auto border border-gray-300 rounded p-4 text-2xl"
      >
        <code>
          {code}
        </code>
      </pre>
      <pre
        className="flex-1 basis-1/2 min-h-64 overflow-auto border border-gray-300 rounded p-4 text-2xl"
      >
        <code>
          {code}
        </code>
      </pre>
    </div>
  );
}
