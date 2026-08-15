import { partialReply } from './openrouter.assistant';

describe('partialReply', () => {
  it('returns undefined before the reply key arrives', () => {
    expect(partialReply('{"act')).toBeUndefined();
    expect(partialReply('{"reply"')).toBeUndefined();
  });

  it('returns the prose written so far', () => {
    expect(partialReply('{"reply": "Commonwealth Hall is')).toBe(
      'Commonwealth Hall is',
    );
  });

  it('stops at the closing quote once the reply is complete', () => {
    expect(
      partialReply('{"reply": "On the ridge.", "actions": [{"type": "X"}]}'),
    ).toBe('On the ridge.');
  });

  it('unescapes the sequences a JSON string can carry', () => {
    expect(partialReply('{"reply": "Line one\\nLine \\"two\\"')).toBe(
      'Line one\nLine "two"',
    );
  });

  it('holds back an escape split across chunks rather than emitting a stray backslash', () => {
    expect(partialReply('{"reply": "Half way\\')).toBe('Half way');
  });

  it('handles an empty reply', () => {
    expect(partialReply('{"reply": ""}')).toBe('');
  });
});
