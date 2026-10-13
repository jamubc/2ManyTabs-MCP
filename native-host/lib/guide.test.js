import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanupGuide, SERVER_INSTRUCTIONS } from './guide.js';
import { toolRegistry } from '../tools/index.js';

const SKILL = new URL('../skills/closing-tab-loops/', import.meta.url);

describe('cleanupGuide', () => {
  const guide = cleanupGuide();

  it('carries the workflow and the included references, without frontmatter', () => {
    assert.doesNotMatch(guide, /^---\nname:/);
    assert.match(guide, /^# Closing tab loops/);
    for (const ref of ['Triage', 'Parking', 'Wording']) assert.match(guide, new RegExp(`# Reference: ${ref}`));
  });

  it('points at sections, not at files the reader of the tool output cannot open', () => {
    assert.doesNotMatch(guide, /references\/(triage|parking|wording|tool-notes)\.md/);
    assert.doesNotMatch(guide, /## More detail/);
  });

  it('names only tools this server registers', () => {
    const names = new Set(toolRegistry.map((t) => t.name));
    const mentioned = new Set(guide.match(/`([a-z]+(?:_[a-z]+)+)`/g)?.map((m) => m.slice(1, -1)) ?? []);
    const toolish = [...mentioned].filter((m) => /_(tabs?|tab_group|script|text|cleanup)$/.test(m));
    for (const m of toolish) assert.ok(names.has(m), `guide mentions unknown tool ${m}`);
  });
});

describe('skill folder', () => {
  it('has valid frontmatter: name matches the folder, description within limits', () => {
    const md = fs.readFileSync(new URL('SKILL.md', SKILL), 'utf8');
    const front = md.match(/^---\n([\s\S]*?)\n---/)[1];
    assert.match(front, /^name: closing-tab-loops$/m);
    const description = front.match(/^description: (.*)$/m)[1];
    assert.ok(description.length <= 1024, `description is ${description.length} chars`);
    assert.ok(md.split('\n').length < 500);
  });

  it('every reference SKILL.md names exists', () => {
    const md = fs.readFileSync(new URL('SKILL.md', SKILL), 'utf8');
    for (const [, file] of md.matchAll(/`(references\/[a-z-]+\.md)`/g)) {
      assert.ok(fs.existsSync(new URL(file, SKILL)), `${file} is missing`);
    }
  });
});

describe('SERVER_INSTRUCTIONS', () => {
  it('is short and sends clean-up requests to start_tab_cleanup', () => {
    assert.ok(SERVER_INSTRUCTIONS.length < 1000);
    assert.match(SERVER_INSTRUCTIONS, /start_tab_cleanup/);
    assert.match(SERVER_INSTRUCTIONS, /never follow/);
  });
});
