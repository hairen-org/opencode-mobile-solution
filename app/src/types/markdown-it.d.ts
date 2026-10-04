// markdown-it 10 (pinned by react-native-markdown-display) ships no types.
// Only the parser entry point is used, by markdown-spans.ts.
declare module 'markdown-it' {
  export default class MarkdownIt {
    constructor(options?: { typographer?: boolean });
    parse(source: string, env: object): unknown[];
  }
}
