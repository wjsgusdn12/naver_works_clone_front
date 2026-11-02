"use client";

import { BoardImage } from "@/components/board/board-image";
import { Spinner } from "@/components/common/loading";
import { Tooltip } from "@/components/common/tooltip";
import { boardApi } from "@/lib/api/board-api";
import { IMAGE_ACCEPT, MAX_ATTACHMENT_SIZE } from "@/lib/attachment-files";
import Image from "@tiptap/extension-image";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type ReactNodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// 본문 속 사진. 주소(src) 대신 서버 첨부 ID만 문서에 남기고, 화면에는 토큰으로 받아 그림.
// 다른 사이트에서 붙여 넣은 사진(첨부 ID 없음)은 받지 않음(서버가 거절하므로).
const BoardImageNode = Image.extend({
  addAttributes() {
    return {
      attachmentId: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          Number(element.getAttribute("data-attachment-id")) || null,
        renderHTML: (attributes: { attachmentId: number | null }) => ({
          "data-attachment-id": attributes.attachmentId,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-attachment-id]" }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EditorImageView);
  },
});

function EditorImageView({ node, selected }: ReactNodeViewProps) {
  const id = Number(node.attrs.attachmentId);
  return (
    <NodeViewWrapper data-drag-handle>
      {id > 0 && <BoardImage attachmentId={id} selected={selected} />}
    </NodeViewWrapper>
  );
}

// 게시글 편집기. 바뀔 때마다 문서 JSON 문자열을 onChange로 알림. 사진은 버튼·붙여넣기·끌어다 놓기로 올림.
export function BoardEditor({
  accessToken,
  initialContent,
  onChange,
  onUploadingChange,
  onError,
}: {
  accessToken: string;
  initialContent: string | null;
  onChange: (json: string) => void;
  onUploadingChange: (count: number) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 붙여넣기·끌어다 놓기 처리기는 편집기를 만들 때 한 번 정해지므로, 최신 올리기 함수를 ref로 넘겨줌.
  const uploadImagesRef = useRef<(files: File[]) => void>(() => undefined);
  const uploadingRef = useRef(0);

  const editor = useEditor({
    // Next 서버 렌더링과 어긋나지 않게 브라우저에서만 그림.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // http·https·mailto만 링크로 인정(서버도 같은 기준으로 다시 거름).
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
        },
      }),
      BoardImageNode,
    ],
    content: parseInitial(initialContent),
    editorProps: {
      attributes: {
        class: "board-editor-content min-h-[320px] px-4 py-3 text-[15px] leading-7 outline-none",
        "aria-label": "본문",
      },
      handlePaste: (_view, event) => takeImages(event.clipboardData?.files),
      handleDrop: (_view, event) => takeImages((event as DragEvent).dataTransfer?.files),
    },
    onUpdate: ({ editor: current }) => onChange(JSON.stringify(current.getJSON())),
  });

  // 붙여넣기·끌어다 놓기에 사진 파일이 있으면 기본 동작 대신 올려서 넣음.
  function takeImages(files: FileList | undefined) {
    const images = Array.from(files ?? []).filter((file) =>
      IMAGE_ACCEPT.split(",").includes(file.type),
    );
    if (images.length === 0) return false;
    uploadImagesRef.current(images);
    return true;
  }

  const changeUploading = (delta: number) => {
    uploadingRef.current += delta;
    setUploading(uploadingRef.current);
    onUploadingChange(uploadingRef.current);
  };

  const uploadImages = (files: File[]) => {
    if (!editor) return;
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        onError(`${file.name}: 파일은 20MB까지 올릴 수 있습니다.`);
        continue;
      }
      changeUploading(1);
      boardApi
        .uploadAttachment(accessToken, file, () => undefined)
        .then((attachment) => {
          if (attachment.kind !== "IMAGE") {
            onError(`${file.name}: 사진으로 읽을 수 없는 파일입니다.`);
            return;
          }
          editor
            .chain()
            .focus()
            .insertContent({ type: "image", attrs: { attachmentId: attachment.id } })
            .run();
        })
        .catch((error: unknown) =>
          onError(error instanceof Error ? error.message : "사진을 올리지 못했습니다."),
        )
        .finally(() => changeUploading(-1));
    }
  };
  useEffect(() => {
    uploadImagesRef.current = uploadImages;
  });

  return (
    <div className="rounded-lg border border-slate-300 focus-within:border-blue-500">
      {editor && (
        <Toolbar
          editor={editor}
          uploading={uploading}
          onPickImage={() => fileInputRef.current?.click()}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          uploadImages(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

const parseInitial = (json: string | null) => {
  if (!json) return "";
  try {
    return JSON.parse(json) as object;
  } catch {
    return "";
  }
};

function Toolbar({
  editor,
  uploading,
  onPickImage,
}: {
  editor: Editor;
  uploading: number;
  onPickImage: () => void;
}) {
  // 툴바 버튼의 켜짐 상태만 골라 구독(글자 하나 칠 때마다 편집기 전체를 다시 그리지 않음).
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      h1: current.isActive("heading", { level: 1 }),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      quote: current.isActive("blockquote"),
      code: current.isActive("codeBlock"),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const chain = () => editor.chain().focus();

  const openLink = () => {
    setHref((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkOpen((open) => !open);
  };
  const applyLink = () => {
    const value = href.trim();
    if (!value) chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: value }).run();
    setLinkOpen(false);
  };

  return (
    <div className="border-b border-slate-200">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolButton
          label="굵게"
          icon={Bold}
          active={state.bold}
          onClick={() => chain().toggleBold().run()}
        />
        <ToolButton
          label="기울임"
          icon={Italic}
          active={state.italic}
          onClick={() => chain().toggleItalic().run()}
        />
        <ToolButton
          label="밑줄"
          icon={Underline}
          active={state.underline}
          onClick={() => chain().toggleUnderline().run()}
        />
        <ToolButton
          label="취소선"
          icon={Strikethrough}
          active={state.strike}
          onClick={() => chain().toggleStrike().run()}
        />
        <Divider />
        <ToolButton
          label="제목 1"
          icon={Heading1}
          active={state.h1}
          onClick={() => chain().toggleHeading({ level: 1 }).run()}
        />
        <ToolButton
          label="제목 2"
          icon={Heading2}
          active={state.h2}
          onClick={() => chain().toggleHeading({ level: 2 }).run()}
        />
        <ToolButton
          label="제목 3"
          icon={Heading3}
          active={state.h3}
          onClick={() => chain().toggleHeading({ level: 3 }).run()}
        />
        <Divider />
        <ToolButton
          label="글머리 목록"
          icon={List}
          active={state.bullet}
          onClick={() => chain().toggleBulletList().run()}
        />
        <ToolButton
          label="번호 목록"
          icon={ListOrdered}
          active={state.ordered}
          onClick={() => chain().toggleOrderedList().run()}
        />
        <ToolButton
          label="인용"
          icon={Quote}
          active={state.quote}
          onClick={() => chain().toggleBlockquote().run()}
        />
        <ToolButton
          label="코드 블록"
          icon={CodeXml}
          active={state.code}
          onClick={() => chain().toggleCodeBlock().run()}
        />
        <ToolButton label="구분선" icon={Minus} onClick={() => chain().setHorizontalRule().run()} />
        <Divider />
        <ToolButton label="링크" icon={Link2} active={state.link || linkOpen} onClick={openLink} />
        <ToolButton label="사진 넣기" icon={ImagePlus} onClick={onPickImage} />
        {uploading > 0 && (
          <span className="ml-1 flex items-center gap-1 text-xs text-slate-500">
            <Spinner size={12} />
            사진 {uploading}개 올리는 중
          </span>
        )}
        <span className="ml-auto flex items-center gap-0.5">
          <ToolButton
            label="실행 취소"
            icon={Undo2}
            disabled={!state.canUndo}
            onClick={() => chain().undo().run()}
          />
          <ToolButton
            label="다시 실행"
            icon={Redo2}
            disabled={!state.canRedo}
            onClick={() => chain().redo().run()}
          />
        </span>
      </div>
      {linkOpen && (
        <form
          className="flex items-center gap-2 border-t border-slate-100 px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <input
            autoFocus
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://example.com (비우고 적용하면 링크 해제)"
            aria-label="링크 주소"
            maxLength={2048}
            className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="h-8 cursor-pointer rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            적용
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="h-8 cursor-pointer rounded-md border border-slate-200 px-3 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            취소
          </button>
        </form>
      )}
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        // 버튼을 눌러도 편집기의 선택 영역이 풀리지 않게.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />;
}
