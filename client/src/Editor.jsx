import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEffect } from 'react';

const tools = [
  { label: 'B', title: 'Bold', run: (c) => c.toggleBold(), active: (e) => e.isActive('bold') },
  { label: 'I', title: 'Italic', run: (c) => c.toggleItalic(), active: (e) => e.isActive('italic') },
  { label: 'U', title: 'Underline', run: (c) => c.toggleUnderline(), active: (e) => e.isActive('underline') },
  { label: 'H1', title: 'Heading 1', run: (c) => c.toggleHeading({ level: 1 }), active: (e) => e.isActive('heading', { level: 1 }) },
  { label: 'H2', title: 'Heading 2', run: (c) => c.toggleHeading({ level: 2 }), active: (e) => e.isActive('heading', { level: 2 }) },
  { label: '• List', title: 'Bulleted list', run: (c) => c.toggleBulletList(), active: (e) => e.isActive('bulletList') },
  { label: '1. List', title: 'Numbered list', run: (c) => c.toggleOrderedList(), active: (e) => e.isActive('orderedList') },
];

export default function Editor({ initialContent, editable, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="editor">
      {editable && (
        <div className="toolbar">
          {tools.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              className={t.active(editor) ? 'on' : ''}
              onMouseDown={(e) => e.preventDefault()} // keeps text selected when clicking
              onClick={() => t.run(editor.chain().focus()).run()}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}