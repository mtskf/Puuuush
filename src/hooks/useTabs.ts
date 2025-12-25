import { useState, useEffect, useCallback } from 'react';
import type { TabItem, Group } from '@/types';
import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export function useTabs() {
  const [currentTabs, setCurrentTabs] = useState<TabItem[]>([]);

  const formatTab = (tab: chrome.tabs.Tab): TabItem => ({
    id: tab.id?.toString() || uuidv4(),
    url: tab.url || '',
    title: tab.title || 'New Tab',
    favIconUrl: tab.favIconUrl
  });

  const fetchCurrentTabs = useCallback(async () => {
    if (import.meta.env.DEV && !chrome.tabs) {
      // Mock data for dev
      setCurrentTabs([
        { id: '1', title: 'Google', url: 'https://google.com', favIconUrl: 'https://www.google.com/favicon.ico' },
        { id: '2', title: 'GitHub', url: 'https://github.com', favIconUrl: 'https://github.com/favicon.ico' },
      ]);
      return;
    }

    const tabs = await chrome.tabs.query({ currentWindow: true });
    setCurrentTabs(tabs.map(formatTab));
  }, []);

  useEffect(() => {
    fetchCurrentTabs();
  }, [fetchCurrentTabs]);

  const saveCurrentWindow = async (groupName: string) => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const items = tabs.map(formatTab);

    const newGroup: Group = {
      id: uuidv4(),
      title: groupName || 'New Group',
      pinned: false,
      collapsed: false,
      order: Date.now(),
      items,
      createdAt: Date.now()
    };

    await storage.addGroup(newGroup);
    return newGroup;
  };

  return {
    currentTabs,
    fetchCurrentTabs,
    saveCurrentWindow
  };
}
