import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  className?: string;
}

// Emoji-only detection (up to 3 chars, extended pictographic)
const EMOJI_ONLY_RE = /^(\p{Extended_Pictographic}\uFE0F?){1,3}$/u;

// Highlight @mentions inside plain text nodes
function highlightMentions(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const re = /(@[\p{L}0-9_.-]{2,40})/gu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span
        key={`m-${i++}`}
        className="rounded px-1 py-0.5 bg-primary/10 text-primary font-medium"
      >
        {match[1]}
      </span>
    );
    lastIndex = match.index + match[1].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") return highlightMentions(children);
  if (Array.isArray(children))
    return children.map((c, i) =>
      typeof c === "string" ? <span key={i}>{highlightMentions(c)}</span> : c
    );
  return children;
}

export function MessageBody({ content, className }: Props) {
  const isEmojiOnly = useMemo(() => EMOJI_ONLY_RE.test(content.trim()), [content]);

  if (isEmojiOnly) {
    return <div className={cn("text-4xl leading-tight", className)}>{content.trim()}</div>;
  }

  return (
    <div
      className={cn(
        "text-sm break-words leading-relaxed",
        "[&_p]:m-0 [&_p+p]:mt-1.5",
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_del]:line-through [&_del]:opacity-70",
        "[&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-black/10 dark:[&_code]:bg-white/10 [&_code]:text-[0.85em] [&_code]:font-mono",
        "[&_pre]:mt-1.5 [&_pre]:p-2 [&_pre]:rounded [&_pre]:bg-black/10 dark:[&_pre]:bg-white/10 [&_pre]:overflow-x-auto [&_pre]:text-[0.85em]",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-current/40 [&_blockquote]:pl-2 [&_blockquote]:opacity-80 [&_blockquote]:italic",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-1",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mt-1",
        "[&_li]:my-0.5",
        "[&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium hover:[&_a]:opacity-80",
        className
      )}
    >
      <ReactMarkdown
        skipHtml
        allowedElements={[
          "p", "strong", "em", "del", "code", "pre",
          "blockquote", "ul", "ol", "li", "a", "br",
        ]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {renderChildren(children)}
            </a>
          ),
          p: ({ children }) => <p>{renderChildren(children)}</p>,
          li: ({ children }) => <li>{renderChildren(children)}</li>,
          strong: ({ children }) => <strong>{renderChildren(children)}</strong>,
          em: ({ children }) => <em>{renderChildren(children)}</em>,
          del: ({ children }) => <del>{renderChildren(children)}</del>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
