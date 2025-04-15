"use client";

import { ReactElement, useRef, useState } from "react";

export function ClientPage(): ReactElement | null {
  const [code, setCode] = useState<string>("");
  const [snippetName, setSnippetName] = useState<string>("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100"
    >
      <h1
        className="text-3xl font-bold text-center mt-10"
      >
        Ruby CPS Visualizer
      </h1>
      <select
        className="mt-4 p-2 border border-gray-300 rounded"
        value={snippetName}
        onChange={(e) => {
          const name: string = e.currentTarget.value;
          setSnippetName(name);
          const snip = codeExamples.find((example) => example.name === name);
          if (snip) {
            setCode(snip.code);
            if (textarea.current) {
              textarea.current.value = snip.code;
            }
          }
        }}
      >
        <option value="">Select a code snippet</option>
        {codeExamples.map((example) => (
          <option key={example.name} value={example.name}>
            {example.name}
          </option>
        ))}
      </select>
      <textarea
        ref={textarea}
        className="mt-4 p-2 border border-gray-300 rounded w-1/2 h-64"
        onChange={(e) => {
          setCode(e.currentTarget.value);
          setSnippetName("");
        }}
      />
    </div>
  );
}

type CodeSnippet = {
  name: string;
  code: string;
};
const codeExamples: CodeSnippet[] = [
  {
    name: "Add",
    code: "p 1 + 2",
  },
];
