import type {
  GoogleDoc,
  Paragraph,
  ParagraphElement,
  StructuralElement,
  Table,
} from "./types";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function renderElement(element: ParagraphElement, documentId: string): string {
  if (element.textRun) {
    const content = escapeHtml(element.textRun.content ?? "").replace(/\n/g, "<br>");
    const style = element.textRun.textStyle ?? {};
    let result = content;
    if (style.bold) result = `<strong>${result}</strong>`;
    if (style.italic) result = `<em>${result}</em>`;
    if (style.underline) result = `<u>${result}</u>`;
    if (style.strikethrough) result = `<s>${result}</s>`;
    if (style.baselineOffset === "SUPERSCRIPT") result = `<sup>${result}</sup>`;
    if (style.baselineOffset === "SUBSCRIPT") result = `<sub>${result}</sub>`;
    const href = safeUrl(style.link?.url);
    if (href) result = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${result}</a>`;
    return result;
  }

  const objectId = element.inlineObjectElement?.inlineObjectId;
  if (objectId) {
    return `<img class="doc-image" loading="lazy" src="/api/image/${encodeURIComponent(documentId)}/${encodeURIComponent(objectId)}" alt="Document image">`;
  }
  if (element.horizontalRule) return "<hr>";
  if (element.person?.personProperties?.name) {
    return `<span class="person">@${escapeHtml(element.person.personProperties.name)}</span>`;
  }
  return "";
}

function renderParagraph(paragraph: Paragraph, documentId: string): string {
  const content = (paragraph.elements ?? []).map((element) => renderElement(element, documentId)).join("");
  if (!content || content === "<br>") return '<div class="doc-spacer"></div>';

  if (paragraph.bullet) {
    const level = Math.min(paragraph.bullet.nestingLevel ?? 0, 5);
    return `<div class="list-item level-${level}"><span class="bullet">•</span><div>${content}</div></div>`;
  }

  const style = paragraph.paragraphStyle?.namedStyleType ?? "NORMAL_TEXT";
  const tag: Record<string, string> = {
    TITLE: "h1",
    SUBTITLE: "p",
    HEADING_1: "h2",
    HEADING_2: "h3",
    HEADING_3: "h4",
    HEADING_4: "h5",
    HEADING_5: "h6",
    HEADING_6: "h6",
  };
  const selected = tag[style] ?? "p";
  const className = style === "SUBTITLE" ? ' class="doc-subtitle"' : "";
  return `<${selected}${className}>${content}</${selected}>`;
}

function renderTable(table: Table, documentId: string): string {
  const rows = (table.tableRows ?? []).map((row) => {
    const cells = (row.tableCells ?? []).map(
      (cell) => `<td>${renderStructuralElements(cell.content ?? [], documentId)}</td>`,
    ).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `<div class="table-scroll"><table><tbody>${rows}</tbody></table></div>`;
}

export function renderStructuralElements(elements: StructuralElement[], documentId: string): string {
  return elements.map((element) => {
    if (element.paragraph) return renderParagraph(element.paragraph, documentId);
    if (element.table) return renderTable(element.table, documentId);
    return "";
  }).join("");
}

export function renderGoogleDocument(document: GoogleDoc, documentId: string): string {
  if (document.tabs?.length) {
    const renderTabs = (tabs: NonNullable<GoogleDoc["tabs"]>, depth = 0): string =>
      tabs.map((tab) => {
        const title = tab.tabProperties?.title;
        const heading = title && depth > 0
          ? `<h2 class="tab-title">${escapeHtml(title)}</h2>`
          : "";
        const body = renderStructuralElements(tab.documentTab?.body?.content ?? [], documentId);
        return `${heading}${body}${renderTabs(tab.childTabs ?? [], depth + 1)}`;
      }).join("");
    return renderTabs(document.tabs);
  }
  return renderStructuralElements(document.body?.content ?? [], documentId);
}
