// src/components/common/MarkdownEditor.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonGroup, Form, Tabs, Tab, OverlayTrigger, Tooltip } from "react-bootstrap";
import Markdown from "./Markdown";

type KeyTab = "write" | "preview";

export interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  minHeight?: number;
  className?: string;
}

function withTooltip(children: any, tip: string) {
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip>{tip}</Tooltip>}>
      <span>{children}</span>
    </OverlayTrigger>
  );
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 6,
  minHeight = 120,
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<KeyTab>("write");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Remember and restore caret after programmatic edits
  const selRef = useRef<{ start: number; end: number } | null>(null);
  useEffect(() => {
    if (selRef.current && taRef.current) {
      const { start, end } = selRef.current;
      requestAnimationFrame(() => {
        if (!taRef.current) return;
        taRef.current.focus();
        taRef.current.setSelectionRange(start, end);
        selRef.current = null;
      });
    }
  }, [value]);

  const setVal = useCallback((next: string, caret?: { start: number; end: number }) => {
    if (typeof caret !== "undefined") selRef.current = caret;
    onChange(next);
  }, [onChange]);

  const wrapSelection = useCallback((before: string, after: string = before) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const sel = value.slice(start, end) || "text";
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    const newStart = start + before.length;
    const newEnd = newStart + sel.length;
    setVal(next, { start: newStart, end: newEnd });
  }, [value, setVal]);

  const addLink = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const sel = value.slice(start, end) || "link text";
    const snippet = `[${sel}](https://)`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    const caret = start + snippet.indexOf("https://");
    const newSelStart = caret;
    const newSelEnd = caret + "https://".length;
    setVal(next, { start: newSelStart, end: newSelEnd });
  }, [value, setVal]);

  const prefixLines = useCallback((prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;

    const before = value.slice(0, start);
    const sel = value.slice(start, end);
    const after = value.slice(end);

    // Expand selection to full lines
    const lineStart = before.lastIndexOf("\n") + 1;
    const nextNewline = after.indexOf("\n");
    const lineEnd = end + (nextNewline === -1 ? 0 : nextNewline);
    const selection = value.slice(lineStart, lineEnd === 0 ? undefined : lineEnd);

    const lines = selection.split("\n");
    const updated = lines.map((l) => (l.startsWith(prefix) ? l : `${prefix}${l}`)).join("\n");

    const next = value.slice(0, lineStart) + updated + value.slice(lineStart + selection.length);
    const delta = updated.length - selection.length;
    setVal(next, { start: start + (lineStart < start ? prefix.length : 0), end: end + delta });
  }, [value, setVal]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrapSelection("**", "**");
    } else if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      wrapSelection("_", "_");
    } else if (e.key.toLowerCase() === "k") {
      e.preventDefault();
      addLink();
    }
  }, [wrapSelection, addLink]);

  return (
    <div className={className}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <ButtonGroup size="sm">
          {withTooltip(
            <Button variant="outline-secondary" onClick={() => wrapSelection("**", "**")}>
              <strong>B</strong>
            </Button>,
            "Bold (Ctrl/Cmd+B)"
          )}
          {withTooltip(
            <Button variant="outline-secondary" onClick={() => wrapSelection("_", "_")}>
              <em>I</em>
            </Button>,
            "Italic (Ctrl/Cmd+I)"
          )}
          {withTooltip(
            <Button variant="outline-secondary" onClick={() => prefixLines("# ")}>
              H1
            </Button>,
            "Heading 1"
          )}
          {withTooltip(
            <Button variant="outline-secondary" onClick={() => prefixLines("## ")}>
              H2
            </Button>,
            "Heading 2"
          )}
          {withTooltip(
            <Button variant="outline-secondary" onClick={() => prefixLines("- ")}>
              • List
            </Button>,
            "Bulleted list"
          )}
          {withTooltip(
            <Button variant="outline-secondary" onClick={addLink}>
              Link
            </Button>,
            "Insert link (Ctrl/Cmd+K)"
          )}
          {withTooltip(
            <Button variant="outline-secondary" onClick={() => wrapSelection("`", "`")}>
              Code
            </Button>,
            "Inline code"
          )}
        </ButtonGroup>

        <Tabs
          id="md-editor-tabs"
          activeKey={tab}
          onSelect={(k) => setTab((k as KeyTab) ?? "write")}
        >
          <Tab eventKey="write" title="Write" />
          <Tab eventKey="preview" title="Preview" />
        </Tabs>
      </div>

      {tab === "write" ? (
        <Form.Control
          as="textarea"
          rows={rows}
          style={{ minHeight }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          ref={taRef}
        />
      ) : (
        <div className="border rounded p-2 bg-light" style={{ minHeight }}>
          <Markdown>{value || "_(no content)_"}</Markdown>
        </div>
      )}
    </div>
  );
}
