import { describe, it, expect } from "vitest";

import { __selftest } from "../../open-sse/executors/webCookieToolBridge.js";

const { parseToolCallReply, buildToolInstructions, buildToolReminder, selectableTools } = __selftest;

const tools = [
  {
    type: "function",
    function: {
      name: "bash",
      description: "Run a shell command",
      parameters: {
        type: "object",
        properties: { command: { type: "string" }, description: { type: "string" } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read",
      description: "Read a file",
      parameters: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] },
    },
  },
  {
    type: "function",
    function: {
      name: "edit",
      description: "Edit a file",
      parameters: { type: "object", properties: { filePath: { type: "string" }, oldString: { type: "string" } } },
    },
  },
];

const body = { tools, tool_choice: "auto" };

function parse(text, override = body) {
  return parseToolCallReply(text, override);
}

describe("parseToolCallReply - JSON protocol", () => {
  it("reads a fenced tool_call block", () => {
    const { content, calls } = parse('```tool_call\n{"name": "read", "arguments": {"filePath": "/a"}}\n```');
    expect(content).toBe("");
    expect(calls).toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
  });

  it("reads a json fence without the tool_call word", () => {
    const { content, calls } = parse('```json\n{"name": "read", "arguments": {"filePath": "/a"}}\n```');
    expect(content).toBe("");
    expect(calls).toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
  });

  it("reads the marker style fed to some providers", () => {
    const { calls } = parse('<<TOOL_CALL>> {"name": "read", "arguments": {"filePath": "/a"}} <<TOOL_CALL>>');
    expect(calls).toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
  });

  it("reads a single-backtick payload and cleans it from content", () => {
    const { content, calls } = parse('`tool_call {"name": "read", "arguments": {"filePath": "/a"}}`');
    expect(content).toBe("");
    expect(calls).toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
  });

  it("reads a colon form and a bare JSON payload", () => {
    expect(parse('tool_call: {"name": "read", "arguments": {"filePath": "/a"}}').calls).toHaveLength(1);
    expect(parse('{"name": "read", "arguments": {"filePath": "/a"}}').calls).toHaveLength(1);
  });

  it("parses arguments sent as a JSON string and tolerates trailing commas", () => {
    expect(parse('{"name": "read", "arguments": "{\\"filePath\\": \\"/a\\"}"}').calls)
      .toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
    expect(parse('{"name": "read", "arguments": {"filePath": "/a",}}').calls)
      .toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
  });

  it("recovers several calls from one reply", () => {
    const { content, calls } = parse(
      '{"name":"read","arguments":{"filePath":"/a"}}\n{"name":"bash","arguments":{"command":"ls"}}'
    );
    expect(content).toBe("");
    expect(calls).toEqual([
      { name: "read", arguments: { filePath: "/a" } },
      { name: "bash", arguments: { command: "ls" } },
    ]);
  });

  it("keeps nested arguments intact", () => {
    const { calls } = parse('{"name": "bash", "arguments": {"command": "cat a", "meta": {"deep": {"x": 1}}}}');
    expect(calls[0].arguments).toEqual({ command: "cat a", meta: { deep: { x: 1 } } });
  });

  it("does not treat an echoed tool schema as a call", () => {
    const text = '{"name": "read", "description": "Read a file", "parameters": {"type": "object"}}';
    expect(parse(text)).toEqual({ content: text, calls: [] });
  });

  it("extracts an <answer> block from prose", () => {
    expect(parse("<answer>Jawaban biasa.</answer>")).toEqual({ content: "Jawaban biasa.", calls: [] });
  });
});

describe("parseToolCallReply - function syntax", () => {
  it("reads tool_call: name({...})", () => {
    expect(parse('tool_call: read({"filePath": "/a"})').calls).toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
  });

  it("reads name(key=\"value\")", () => {
    expect(parse('tool_call read(filePath="/a")').calls).toEqual([{ name: "read", arguments: { filePath: "/a" } }]);
  });
});

describe("parseToolCallReply - bare command fallback", () => {
  it("maps a bare command to the shell tool", () => {
    expect(parse("tool_call ls -l /path/to/folder")).toEqual({
      content: "",
      calls: [{ name: "bash", arguments: { command: "ls -l /path/to/folder" } }],
    });
  });

  it("accepts a colon, backticks and a wrapping fence", () => {
    expect(parse("tool_call: cat Soal_UTS.pdf").calls).toEqual([{ name: "bash", arguments: { command: "cat Soal_UTS.pdf" } }]);
    expect(parse("`tool_call: cat a.pdf`").calls).toEqual([{ name: "bash", arguments: { command: "cat a.pdf" } }]);
    expect(parse("```\ntool_call: ls\n```")).toEqual({ content: "", calls: [{ name: "bash", arguments: { command: "ls" } }] });
  });

  it("keeps surrounding prose but removes the command line", () => {
    expect(parse("ada apa saja di folder ini\n\ntool_call ls -l")).toEqual({
      content: "ada apa saja di folder ini",
      calls: [{ name: "bash", arguments: { command: "ls -l" } }],
    });
  });

  it("emits one call per bare command line", () => {
    expect(parse("tool_call pwd\ntool_call whoami").calls).toEqual([
      { name: "bash", arguments: { command: "pwd" } },
      { name: "bash", arguments: { command: "whoami" } },
    ]);
  });

  it("does not guess when no shell-ish tool exists", () => {
    const editOnly = { tools: [tools[2]] };
    expect(parse("tool_call ls -l", editOnly)).toEqual({ content: "tool_call ls -l", calls: [] });
  });

  it("ignores bare commands when no request body is known", () => {
    expect(parse("tool_call ls -l", null)).toEqual({ content: "tool_call ls -l", calls: [] });
  });
});

describe("parseToolCallReply - opt-out", () => {
  it("never recovers a call when tool_choice is none", () => {
    const text = '{"name": "read", "arguments": {"filePath": "/a"}}';
    expect(parse(text, { tools, tool_choice: "none" })).toEqual({ content: text, calls: [] });
  });

  it("leaves plain prose untouched", () => {
    expect(parse("plain answer")).toEqual({ content: "plain answer", calls: [] });
  });
});

describe("tool protocol prompt", () => {
  const defs = selectableTools(body).defs;

  it("stays short enough for small free models", () => {
    // The long paragraph form made DeepAI answer conversationally 4/4 times.
    expect(buildToolInstructions(body, "fenced").length).toBeLessThan(1200);
    expect(buildToolReminder("fenced", { defs, mode: "auto" }).length).toBeLessThan(500);
  });

  it("shows a real tool and its real argument in the reminder", () => {
    const reminder = buildToolReminder("fenced", { defs, mode: "auto", forced: "" });
    expect(reminder).toContain('"name": "bash"');
    expect(reminder).toContain('"command"');
    expect(reminder).not.toContain("run_command");
  });

  it("bans bare commands and ships the schema", () => {
    const instructions = buildToolInstructions(body, "fenced");
    expect(instructions).toMatch(/Never write a bare command/);
    expect(instructions).toContain('"read"');
    expect(instructions).toContain('"edit"');
  });

  it("is empty for tool_choice none", () => {
    expect(buildToolInstructions({ tools, tool_choice: "none" }, "fenced")).toBe("");
  });
});
