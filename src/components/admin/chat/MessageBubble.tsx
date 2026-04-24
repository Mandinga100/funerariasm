import { cn } from "@/lib/utils";
import { Bot, User, Shield, StickyNote } from "lucide-react";

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "bot" | "admin" | "system";
  sender_user_id: string | null;
  content: string;
  is_internal_note: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  voice_url: string | null;
  created_at: string;
}

export function MessageBubble({ msg }: { msg: ChatMessageRow }) {
  const isVisitor = msg.sender_type === "visitor";
  const isBot = msg.sender_type === "bot";
  const isSystem = msg.sender_type === "system";
  const isNote = msg.is_internal_note;

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 my-1.5", isVisitor ? "justify-start" : "justify-end")}>
      {isVisitor && (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
          isVisitor && "bg-muted text-foreground rounded-tl-sm",
          isBot && !isNote && "bg-primary/10 text-foreground rounded-tr-sm",
          !isVisitor && !isBot && !isNote && "bg-primary text-primary-foreground rounded-tr-sm",
          isNote && "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-800/40 rounded-tr-sm"
        )}
      >
        {isNote && (
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold opacity-80">
            <StickyNote className="w-3 h-3" /> Nota interna
          </div>
        )}
        {isBot && !isNote && (
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-medium opacity-70">
            <Bot className="w-3 h-3" /> Bot
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        {msg.attachment_url && (
          <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="mt-1.5 block text-xs underline opacity-80">
            📎 {msg.attachment_name ?? "adjunto"}
          </a>
        )}
        {msg.voice_url && (
          <audio controls src={msg.voice_url} className="mt-1.5 max-w-full h-8" />
        )}
        <div className="text-[10px] opacity-60 mt-1 text-right">
          {new Date(msg.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {!isVisitor && !isBot && !isNote && (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Shield className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
    </div>
  );
}
