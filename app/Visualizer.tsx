import { ReactElement, useMemo } from "react";
import { usePrism } from "./prism";
import { StringifyError, stringifyProgram } from "./stringify";
import { CPSError, cpsProgram } from "./cps";

export type VisualizerProps = {
  code: string;
};

export function Visualizer(props: VisualizerProps): ReactElement | null {
  const { code } = props;
  const parse = usePrism();
  const parseResult = useMemo(() => parse(code), [code, parse]);
  const [s, stringifyError] = useMemo(() => {
    try {
      return [stringifyProgram(cpsProgram(parseResult.value)), null];
    } catch (e) {
      if (e instanceof StringifyError || e instanceof CPSError) {
        return [null, e];
      }
      throw e;
    }
  }, [parseResult]);
  return (
    <>
      {
        (parseResult.errors.length > 0 || !!stringifyError) &&
          <ul
            className="text-red-500"
          >
            {
              parseResult.errors.map((error, index) => (
                <li
                  key={index}
                  className="text-red-500"
                >
                  {error.message}
                </li>
              ))
            }
            {
              !!stringifyError &&
                <li
                  className="text-red-500"
                >
                  {stringifyError.message}
                </li>
            }
          </ul>
      }
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
          className="flex-1 basis-1/2 min-h-64 overflow-auto border border-gray-300 rounded p-4 text-xl"
        >
          <code>
            {s}
          </code>
        </pre>
      </div>
    </>
  );
}
