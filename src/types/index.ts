export interface TabItem {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
}

export interface Group {
  id: string;
  title: string;
  pinned: boolean; // Pinned groups always appear at the top
  collapsed: boolean;
  order: number; // For manual sorting
  items: TabItem[];
  color?: string;
  createdAt: number;
}

export interface StorageSchema {
  groups: Group[];
}
