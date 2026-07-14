import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TiptapEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[140px] px-4 py-3 focus:outline-none text-charcoal",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className="rounded-sm border border-border/60 bg-card">
        <div className="h-11 border-b border-border/60" />
        <div className="min-h-[140px] px-4 py-3 text-sm text-charcoal-soft">
          {placeholder ?? "Notiz eingeben…"}
        </div>
      </div>
    );
  }

  const Btn = ({
    on,
    label,
    onClick,
    icon: Icon,
  }: {
    on: boolean;
    label: string;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-sm text-charcoal-soft transition hover:bg-gold-soft/40 hover:text-gold-deep",
        on && "bg-gold-soft/60 text-gold-deep"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="rounded-sm border border-border/60 bg-card">
      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
        <Btn
          label="Fett"
          icon={Bold}
          on={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <Btn
          label="Kursiv"
          icon={Italic}
          on={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <Btn
          label="Überschrift"
          icon={Heading2}
          on={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <Btn
          label="Aufzählung"
          icon={List}
          on={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <Btn
          label="Nummerierte Liste"
          icon={ListOrdered}
          on={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}