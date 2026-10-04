import type { MessagePart, MessageWithParts } from '@/src/opencode/types';

/**
 * The loaded conversation as one plain string, for the "Select text" sheet.
 *
 * A phone cannot drag a selection from one message card into the next, so the
 * sheet shows every message in one text view instead. `focusOffset` is where
 * the message the user opened it from begins, so the sheet can scroll there.
 */
export function conversationText(messages: MessageWithParts[], focusMessageId?: string) {
  let text = '';
  let focusOffset = 0;
  for (const message of messages) {
    const body = message.parts.map(partText).filter(Boolean).join('\n\n').trim();
    if (!body) continue;
    if (text) text += '\n\n';
    if (message.info.id === focusMessageId) focusOffset = text.length;
    const who = message.info.role === 'user' ? 'You' : `Assistant${message.info.agent ? ` · ${message.info.agent}` : ''}`;
    text += `── ${who} ──\n${body}`;
  }
  return { text, focusOffset };
}

function partText(part: MessagePart): string {
  const record = part as Record<string, unknown>;
  if (part.type === 'text') return typeof record.text === 'string' && !record.synthetic ? record.text : '';
  if (part.type === 'file') return `[file: ${String(record.filename ?? record.url ?? 'attachment')}]`;
  if (part.type === 'tool') {
    const state = (record.state ?? {}) as Record<string, unknown>;
    const input = (state.input ?? {}) as Record<string, unknown>;
    const detail = input.command ?? input.description ?? input.filePath ?? input.pattern ?? state.title ?? '';
    return `[${String(record.tool ?? 'tool')}] ${String(detail)}`.trim();
  }
  return '';
}
