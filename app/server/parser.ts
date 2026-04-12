import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { toString as mdastToString } from 'mdast-util-to-string';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { Root, Content, Heading, List, ListItem, Node, Paragraph } from 'mdast';
import type { Phase, Week, Day, MasteryGate, ResourceGroup, Resource, ChecklistItem } from '../shared/types';
import { makePhaseId, makeWeekId, makeDayId, makeMasteryGateId, slugify } from './ids';

const processor = remark().use(remarkGfm);

function parseMarkdown(source: string): Root {
  return processor.parse(source) as Root;
}

function nodesToMarkdown(nodes: Content[]): string {
  if (nodes.length === 0) return '';
  const root: Root = { type: 'root', children: nodes };
  return processor.stringify(root).trim();
}

interface Section {
  heading: string;
  children: Content[];
}

// Split top-level children by H2 boundaries; collect H1 and pre-H2 nodes as preamble.
function groupByH2(root: Root): { preamble: Content[]; sections: Section[] } {
  const preamble: Content[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const node of root.children) {
    if (node.type === 'heading') {
      const h = node as Heading;
      if (h.depth === 1) {
        preamble.push(node);
      } else if (h.depth === 2) {
        if (current) sections.push(current);
        current = { heading: mdastToString(h), children: [] };
      } else {
        // H3+ inside an H2 section
        if (current) {
          current.children.push(node);
        } else {
          preamble.push(node);
        }
      }
    } else {
      if (current) {
        current.children.push(node);
      } else {
        preamble.push(node);
      }
    }
  }
  if (current) sections.push(current);
  return { preamble, sections };
}

// Split a list of nodes by H3 boundaries.
function groupByH3(nodes: Content[]): { preface: Content[]; sections: Section[] } {
  const preface: Content[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const node of nodes) {
    if (node.type === 'heading' && (node as Heading).depth === 3) {
      if (current) sections.push(current);
      current = { heading: mdastToString(node as Heading), children: [] };
    } else {
      if (current) {
        current.children.push(node);
      } else {
        preface.push(node);
      }
    }
  }
  if (current) sections.push(current);
  return { preface, sections };
}

// Walk nodes deeply to find GFM task-list items (checked !== null/undefined).
function extractChecklistItems(nodes: Content[], prefix: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  let index = 0;

  function walk(node: Node) {
    if (node.type === 'listItem') {
      const item = node as ListItem;
      if (item.checked !== null && item.checked !== undefined) {
        items.push({ id: `${prefix}#${index++}`, text: mdastToString(item).trim() });
      }
    }
    if ('children' in node && Array.isArray((node as any).children)) {
      for (const child of (node as any).children as Node[]) {
        walk(child);
      }
    }
  }

  for (const node of nodes) walk(node);
  return items;
}

function parseTimeBudget(heading: string): string | undefined {
  const m = heading.match(/\(([^)]*\d\s*(?:–|-)\s*\d[^)]*hrs?[^)]*|[^)]*hrs?[^)]*)\)/i);
  return m ? m[1] : undefined;
}

function parseDays(h3Sections: Section[], weekId: string): Day[] {
  return h3Sections.map((section) => {
    const heading = section.heading;
    const id = makeDayId(weekId, heading);
    const timeBudget = parseTimeBudget(heading);
    const bodyMarkdown = nodesToMarkdown(section.children);
    const inlineChecklistItems = extractChecklistItems(section.children, id);
    return { id, heading, timeBudget, bodyMarkdown, inlineChecklistItems };
  });
}

function parseWeek(section: Section, phaseId: string, weekNumber: number): Week {
  const weekId = makeWeekId(phaseId, weekNumber);

  // Extract title: text after "Week N — " (handles em-dash, en-dash, hyphen)
  const titleMatch = section.heading.match(/^Week\s+\d+[–—-]\d*\s*[–—-]\s*(.+)/i)
    ?? section.heading.match(/^Week\s+\d+\s+[–—-]\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : section.heading;

  const { preface, sections: h3Sections } = groupByH3(section.children);

  // Extract goal from first paragraph starting with "Goal:"
  let goal: string | undefined;
  for (const node of preface) {
    if (node.type === 'paragraph') {
      const text = mdastToString(node as Paragraph);
      if (text.startsWith('Goal:')) {
        goal = text.slice(5).trim();
        break;
      }
    }
  }

  const days = parseDays(h3Sections, weekId);
  return { id: weekId, number: weekNumber, title, goal, days };
}

function parseResourceItem(text: string): { label: string; url: string } | null {
  const urlMatch = text.match(/(https?:\/\/[^\s)>\]]+)/);
  if (!urlMatch) return null;
  const url = urlMatch[1].replace(/[.,;)>\]]+$/, ''); // strip trailing punctuation
  const beforeUrl = text.slice(0, text.indexOf(urlMatch[1])).trim();

  // Try to extract a clean label from bold text in the raw segment
  const boldMatch = text.match(/\*\*(.+?)\*\*/);
  let label: string;
  if (boldMatch) {
    label = boldMatch[1];
  } else {
    // Split on em-dash / en-dash / double-hyphen and take the first segment
    const parts = beforeUrl.split(/\s+[–—-]+\s+/);
    label = parts[0].trim().replace(/^[^\w\d(["'«]+/, '').trim();
  }

  return { label: label || url, url };
}

function mapResourceCategory(h3Text: string): ResourceGroup['category'] {
  const lower = h3Text.toLowerCase();
  if (lower.includes('primary') || lower.includes('must-use') || lower.includes('must use')) return 'primary';
  if (lower.includes('video') && (lower.includes('must') || lower.includes('required'))) return 'videos-must';
  if (lower.includes('video') || (lower.includes('optional') && lower.includes('time'))) return 'videos-optional';
  if (lower.includes('book')) return 'books';
  if (lower.includes('free') || lower.includes('alternative') || lower.includes('supplementary')) return 'free-alt';
  if (lower.includes('apple') || lower.includes('app store')) return 'apple-dev';
  if (lower.includes('tool')) return 'tools';
  return 'tools';
}

function parseResources(section: Section): ResourceGroup[] {
  const groups: ResourceGroup[] = [];
  let currentGroup: ResourceGroup | null = null;

  for (const node of section.children) {
    if (node.type === 'heading' && (node as Heading).depth === 3) {
      if (currentGroup && currentGroup.items.length > 0) groups.push(currentGroup);
      const label = mdastToString(node as Heading);
      currentGroup = { category: mapResourceCategory(label), label, items: [] };
    } else if (node.type === 'list' && currentGroup) {
      const list = node as List;
      for (const item of list.children) {
        const text = mdastToString(item);
        const parsed = parseResourceItem(text);
        if (parsed) {
          currentGroup.items.push({
            id: slugify(parsed.url),
            url: parsed.url,
            label: parsed.label,
          });
        }
      }
    }
  }
  if (currentGroup && currentGroup.items.length > 0) groups.push(currentGroup);
  return groups;
}

function parseMasteryGate(section: Section, phaseId: string): MasteryGate {
  const id = makeMasteryGateId(phaseId);
  const checklist = extractChecklistItems(section.children, id);
  const bodyMarkdown = nodesToMarkdown(section.children);
  return { id, bodyMarkdown, checklist };
}

export function parsePhaseFile(filePath: string): Phase {
  const source = readFileSync(filePath, 'utf-8');
  const filename = filePath.split('/').pop() ?? '';

  const phaseNumMatch = filename.match(/PHASE_(\d+)\.md/i);
  if (!phaseNumMatch) throw new Error(`Cannot parse phase number from filename: ${filename}`);
  const phaseNumber = parseInt(phaseNumMatch[1], 10);
  const phaseId = makePhaseId(phaseNumber);

  const tree = parseMarkdown(source);
  const { preamble, sections } = groupByH2(tree);

  // Title from H1, stripping "Phase N — " prefix
  const h1 = preamble.find((n) => n.type === 'heading' && (n as Heading).depth === 1) as Heading | undefined;
  const rawTitle = h1 ? mdastToString(h1) : `Phase ${phaseNumber}`;
  const titleMatch = rawTitle.match(/^Phase\s+\d+\s*[–—-]+\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : rawTitle;

  // Duration from preamble paragraph containing "Duration:"
  let duration = '';
  for (const node of preamble) {
    if (node.type === 'paragraph') {
      const text = mdastToString(node as Paragraph);
      const m = text.match(/Duration:\s*([^·•\n]+)/);
      if (m) { duration = m[1].trim(); break; }
    }
  }

  let translatingToYourOwnApp: string | undefined;
  let whatYoullHave = '';
  let willNotDo = '';
  let ifStuck = '';
  let whenDone = '';
  let masteryGate: MasteryGate | null = null;
  let resources: ResourceGroup[] = [];
  const weeks: Week[] = [];
  let prerequisitesSection: Section | null = null;

  for (const section of sections) {
    const h = section.heading.toLowerCase();

    if (h.startsWith('translating to your own app')) {
      translatingToYourOwnApp = nodesToMarkdown(section.children);
    } else if (h.startsWith("what you'll have") || h.startsWith("what you will have")) {
      whatYoullHave = nodesToMarkdown(section.children);
    } else if (h.startsWith('what you will not do') || h.startsWith("what you won't do")) {
      willNotDo = nodesToMarkdown(section.children);
    } else if (/^week\s+\d/.test(h)) {
      const weekNumMatch = section.heading.match(/^Week\s+(\d+)/i);
      const weekNum = weekNumMatch ? parseInt(weekNumMatch[1], 10) : weeks.length + 1;
      weeks.push(parseWeek(section, phaseId, weekNum));
    } else if (h.startsWith('prerequisites checklist')) {
      prerequisitesSection = section;
    } else if (h.startsWith('mastery gate')) {
      masteryGate = parseMasteryGate(section, phaseId);
    } else if (h.startsWith('resources')) {
      resources = parseResources(section);
    } else if (h.startsWith('if you get stuck') || h.startsWith("if you're stuck")) {
      ifStuck = nodesToMarkdown(section.children);
    } else if (h.startsWith("when you're done") || h.startsWith('when you are done') || h.startsWith('when you')) {
      whenDone = nodesToMarkdown(section.children);
    }
    // Unknown sections silently ignored
  }

  // PHASE_0 special: prerequisites checklist → synthetic Week 0
  if (prerequisitesSection) {
    const weekId = makeWeekId(phaseId, 0);
    const checklistItems = extractChecklistItems(prerequisitesSection.children, `${weekId}/prerequisites`);
    const syntheticDay: Day = {
      id: `${weekId}/prerequisites`,
      heading: 'Prerequisites checklist',
      bodyMarkdown: nodesToMarkdown(prerequisitesSection.children),
      inlineChecklistItems: checklistItems,
    };
    weeks.unshift({ id: weekId, number: 0, title: 'Prerequisites', days: [syntheticDay] });
  }

  if (!masteryGate) {
    masteryGate = { id: makeMasteryGateId(phaseId), bodyMarkdown: '', checklist: [] };
  }

  return {
    id: phaseId,
    number: phaseNumber,
    title,
    duration,
    translatingToYourOwnApp,
    willNotDo,
    whatYoullHave,
    weeks,
    masteryGate,
    resources,
    ifStuck,
    whenDone,
  };
}

export function parseAllPhases(rootDir: string): Phase[] {
  const files = readdirSync(rootDir)
    .filter((f) => /^PHASE_\d+\.md$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)![0], 10);
      const nb = parseInt(b.match(/\d+/)![0], 10);
      return na - nb;
    });

  return files.map((f) => parsePhaseFile(join(rootDir, f)));
}
