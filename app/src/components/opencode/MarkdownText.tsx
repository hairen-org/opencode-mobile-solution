import Markdown from 'react-native-markdown-display';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/ui/palette';

import { markdownStyleSource } from './markdown-theme';
import { SelectableBlock } from './SelectableBlock';
import { SelectableMarkdown } from './SelectableMarkdown';

export { markdownStyleSource } from './markdown-theme';

export function MarkdownText({ children, muted = false, testID }: { children: string; muted?: boolean; testID?: string }) {
  // On iOS each block would be its own text view, and a selection cannot leave
  // the view it started in; the whole message has to be one.
  if (Platform.OS === 'ios') {
    return (
      <View testID={testID} style={styles.container}>
        <SelectableMarkdown source={children} muted={muted} />
      </View>
    );
  }
  return (
    <View testID={testID} style={styles.container}>
      <Markdown rules={selectableRules} style={muted ? mutedMarkdownStyles : markdownStyles}>
        {children}
      </Markdown>
    </View>
  );
}

// iOS decides selectability from the outermost Text of a paragraph only, and
// the library wraps every paragraph in a plain one (textgroup, inline). Marking
// just the leaves left whole paragraphs unselectable on the phone.
const selectableRules = {
  textgroup: (node: any, children: any, _parent: any, styles: any) => (
    <Text key={node.key} selectable style={styles.textgroup}>
      {children}
    </Text>
  ),
  inline: (node: any, children: any, _parent: any, styles: any) => (
    <Text key={node.key} selectable style={styles.inline}>
      {children}
    </Text>
  ),
  text: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => (
    <Text key={node.key} selectable style={[inheritedStyles, styles.text]}>
      {node.content}
    </Text>
  ),
  code_inline: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => (
    <Text key={node.key} selectable style={[inheritedStyles, styles.code_inline]}>
      {node.content}
    </Text>
  ),
  code_block: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => (
    <SelectableBlock key={node.key} style={[inheritedStyles, styles.code_block]} text={String(node.content).replace(/\n$/, '')} />
  ),
  fence: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => (
    <SelectableBlock key={node.key} style={[inheritedStyles, styles.fence]} text={String(node.content).replace(/\n$/, '')} />
  ),
};

const markdownStyles = StyleSheet.create(markdownStyleSource);
const mutedMarkdownStyles = StyleSheet.create({
  ...markdownStyleSource,
  body: { ...markdownStyleSource.body, color: palette.textMuted },
  paragraph: { ...markdownStyleSource.paragraph, color: palette.textMuted },
});

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
});
