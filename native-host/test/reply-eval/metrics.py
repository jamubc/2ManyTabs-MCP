# Summarise one headless run (stream-json): the final reply plus the numbers that matter to a tired reader.
import json, re, sys
events = [json.loads(l) for l in open(sys.argv[1])]
texts, tools, tool_chars = [], [], 0
for e in events:
    if e.get('type') == 'assistant':
        for c in e['message']['content']:
            if c['type'] == 'text': texts.append(c['text'])
            if c['type'] == 'tool_use': tools.append(c['name'].split('__')[-1])
    if e.get('type') == 'user':
        for c in e['message']['content']:
            if isinstance(c, dict) and c.get('type') == 'tool_result':
                cc = c['content']; tool_chars += len(cc if isinstance(cc, str) else ''.join(x.get('text', '') for x in cc))
res = [e for e in events if e.get('type') == 'result'][-1]
reply = texts[-1] if texts else ''
lines = [l for l in reply.splitlines() if l.strip()]
m = {
  'reply_lines': len(lines), 'reply_words': len(reply.split()),
  'questions': reply.count('?'), 'table': bool(re.search(r'^\s*\|.*\|', reply, re.M) or '┌' in reply),
  'path_shown': bool(re.search(r'(~|/Users)/\S*snapshots', reply)), 'headings': len(re.findall(r'^#+ |^\*\*[^*]+\*\*\s*$', reply, re.M)),
  'tool_calls': len(tools), 'tools': ' '.join(tools), 'tool_output_chars': tool_chars,
  'secs': round(res.get('duration_ms', 0) / 1000), 'cost_usd': round(res.get('total_cost_usd', 0), 3),
}
print(json.dumps(m))
if len(sys.argv) > 2: print('-----\n' + reply)
