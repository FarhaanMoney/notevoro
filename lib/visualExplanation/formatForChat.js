/**
 * Format visual learning experience for chat (no JSON.stringify on raw objects).
 */
export function formatVisualExplanationForChat(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;

  const lines = [];
  const title = data.title;
  const summary = data.short_summary || data.summary;
  const keyIdea = data.key_idea || data.keyIdea;

  if (title) lines.push(`## ${title}`);
  if (summary) lines.push(summary);
  if (keyIdea) lines.push(`**Core idea:** ${keyIdea}`);

  const blocks = data.blocks || [];
  for (const block of blocks) {
    if (!block?.type) continue;
    if (block.type === 'concept') {
      lines.push(`### ${block.title}`);
      lines.push(block.summary || '');
    } else if (block.type === 'steps' && block.steps) {
      lines.push(`### ${block.title || 'Steps'}`);
      block.steps.forEach((s, i) => lines.push(`${i + 1}. **${s.title}** — ${s.description}`));
    } else if (block.type === 'quiz') {
      lines.push(`### Quiz`);
      lines.push(block.question);
      (block.options || []).forEach((o, i) => lines.push(`${i + 1}. ${o}`));
    } else if (block.type === 'takeaway' && block.points) {
      lines.push('### Key takeaways');
      block.points.forEach((p) => lines.push(`- ${p}`));
    }
  }

  const takeaways = data.key_takeaways;
  if (Array.isArray(takeaways) && takeaways.length) {
    lines.push('### Remember');
    takeaways.forEach((t) => lines.push(`- ${t}`));
  }

  return lines.filter(Boolean).join('\n\n').trim() || 'Visual explanation generated.';
}

export function coerceVisualExplanationTopic(topic, fallback = '') {
  if (typeof topic === 'string') return topic.trim() || fallback;
  if (topic && typeof topic === 'object' && 'nativeEvent' in topic) return fallback;
  return fallback;
}
