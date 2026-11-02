"use client";

import { BoardImage } from "@/components/board/board-image";
import type { ReactNode } from "react";

// 편집기(Tiptap) 문서 JSON을 React 요소로 그림. HTML 문자열을 넣지 않아(dangerouslySetInnerHTML 미사용)
// 서버 검사를 지나온 값이라도 스크립트가 실행될 길이 없음. 모르는 노드·서식은 글자만 보여 주거나 건너뜀.
type DocNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: DocNode[];
};

const safeHref = (value: unknown) =>
  typeof value === "string" && /^(https?:|mailto:)/i.test(value.trim()) ? value.trim() : null;

function renderText(node: DocNode, key: number) {
  let element: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") element = <strong>{element}</strong>;
    else if (mark.type === "italic") element = <em>{element}</em>;
    else if (mark.type === "underline") element = <u>{element}</u>;
    else if (mark.type === "strike") element = <s>{element}</s>;
    else if (mark.type === "code")
      element = <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">{element}</code>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (href)
        element = (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-blue-600 underline"
          >
            {element}
          </a>
        );
    }
  }
  return <span key={key}>{element}</span>;
}

function renderNodes(nodes: DocNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, index));
}

function renderNode(node: DocNode, key: number): ReactNode {
  const children = renderNodes(node.content);
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return (
        <p key={key} className="min-h-[1.5em]">
          {children}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      const className =
        level === 1
          ? "text-2xl font-bold"
          : level === 2
            ? "text-xl font-bold"
            : "text-lg font-bold";
      return level === 1 ? (
        <h2 key={key} className={className}>
          {children}
        </h2>
      ) : level === 2 ? (
        <h3 key={key} className={className}>
          {children}
        </h3>
      ) : (
        <h4 key={key} className={className}>
          {children}
        </h4>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="list-disc pl-6">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} start={Number(node.attrs?.start ?? 1)} className="list-decimal pl-6">
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return (
        <blockquote key={key} className="border-l-4 border-slate-200 pl-4 text-slate-600">
          {children}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100"
        >
          <code>{children}</code>
        </pre>
      );
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} className="border-slate-200" />;
    case "image": {
      const id = Number(node.attrs?.attachmentId);
      return Number.isFinite(id) && id > 0 ? <BoardImage key={key} attachmentId={id} /> : null;
    }
    default:
      return children.length > 0 ? <span key={key}>{children}</span> : null;
  }
}

export function RichContent({ json }: { json: string }) {
  let doc: DocNode | null = null;
  try {
    doc = JSON.parse(json) as DocNode;
  } catch {
    doc = null;
  }
  if (!doc) return <p className="text-sm text-slate-400">본문을 표시하지 못했습니다.</p>;
  return (
    <div className="board-rich-content flex flex-col gap-2 text-[15px] leading-7 text-slate-800">
      {renderNodes(doc.content)}
    </div>
  );
}
