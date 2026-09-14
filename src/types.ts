export interface SessionUser {
  id: string;
  username: string;
  globalName?: string;
  avatar?: string;
  roles: string[];
  exp: number;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

export interface DiscordMember {
  roles: string[];
  nick?: string | null;
  user?: DiscordUser;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  description?: string;
}

export interface GoogleDoc {
  title?: string;
  body?: { content?: StructuralElement[] };
  tabs?: GoogleTab[];
  inlineObjects?: Record<string, InlineObject>;
}

export interface GoogleTab {
  tabProperties?: { tabId?: string; title?: string };
  documentTab?: {
    body?: { content?: StructuralElement[] };
    inlineObjects?: Record<string, InlineObject>;
  };
  childTabs?: GoogleTab[];
}

export interface StructuralElement {
  paragraph?: Paragraph;
  table?: Table;
  sectionBreak?: unknown;
}

export interface Paragraph {
  paragraphStyle?: { namedStyleType?: string };
  bullet?: { listId?: string; nestingLevel?: number };
  elements?: ParagraphElement[];
}

export interface ParagraphElement {
  textRun?: {
    content?: string;
    textStyle?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      baselineOffset?: string;
      link?: { url?: string };
    };
  };
  inlineObjectElement?: { inlineObjectId?: string };
  horizontalRule?: unknown;
  person?: { personProperties?: { name?: string } };
}

export interface Table {
  tableRows?: Array<{
    tableCells?: Array<{ content?: StructuralElement[] }>;
  }>;
}

export interface InlineObject {
  inlineObjectProperties?: {
    embeddedObject?: {
      title?: string;
      description?: string;
      imageProperties?: { contentUri?: string };
    };
  };
}
