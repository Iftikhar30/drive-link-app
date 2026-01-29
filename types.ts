
export type ItemType = 'image' | 'video' | 'document' | 'folder' | 'other';

export interface FolderItem {
  id: string;
  name: string;
  type: ItemType;
  link: string;
}

export interface Folder {
  id: string;
  name: string;
  title?: string;
  mainLink?: string;
  mainLinkName?: string;
  link?: string;
  items: FolderItem[];
  createdAt: number;
  order?: number;
}

export type ViewState = 'dashboard' | 'update-password' | 'search';
export type AuthStatus = 'logged-out' | 'user' | 'admin' | 'admin-login';