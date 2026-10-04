import { describe, expect, it } from 'vitest';

import type { MessageWithParts } from '@/src/opencode/types';

import { conversationText } from './conversation-text';

const messages = [
  { info: { id: 'm1', role: 'user' }, parts: [{ type: 'text', text: 'Run the tests' }] },
  {
    info: { id: 'm2', role: 'assistant', agent: 'build' },
    parts: [
      { type: 'reasoning', text: 'thinking' },
      { type: 'tool', tool: 'bash', state: { input: { command: 'npm test' } } },
      { type: 'text', text: 'All **green**.' },
    ],
  },
  { info: { id: 'm3', role: 'assistant' }, parts: [{ type: 'step-start' }] },
] as unknown as MessageWithParts[];

describe('conversationText', () => {
  it('joins every message into one string with speaker lines', () => {
    expect(conversationText(messages).text).toBe(
      '── You ──\nRun the tests\n\n── Assistant · build ──\n[bash] npm test\n\nAll **green**.',
    );
  });

  it('points at the start of the focused message', () => {
    const { text, focusOffset } = conversationText(messages, 'm2');
    expect(text.slice(focusOffset)).toMatch(/^── Assistant · build ──/);
    expect(conversationText(messages, 'm1').focusOffset).toBe(0);
  });
});
