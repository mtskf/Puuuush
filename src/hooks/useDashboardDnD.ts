import { useState } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Group, TabItem } from '@/types';

export function useDashboardDnD(
  groups: Group[],
  updateGroups: (groups: Group[]) => Promise<void>,
  shiftPressedRef: React.RefObject<boolean>
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<Group | TabItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const currentData = active.data.current;
    setActiveId(active.id as string);
    setActiveItem(currentData?.group || currentData?.tab);
  };

  const handleDragOver = () => {
    // const { over } = event;
    // if (!over) return;
    // Real-time visual feedback is handled by dnd-kit
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    // We used string literals 'Group' and 'Tab' in the original code.
    // We should ensure the Item components (GroupCard/TabCard) are using the same types in useSortable/useDraggable data.
    // Assuming they use { type: 'Group' } or { type: 'Tab' }.

    // Note: In constants we defined 'group' and 'tab' (lowercase), but checking original code:
    // Line 199: if (activeType === 'Group')
    // Line 204: } else if (overType === 'Tab')
    // So it seems they are Capitalized in the component data.

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Group Reordering / Merging
    if (activeType === 'Group') {
        let targetGroupId: string | null = null;

        if (overType === 'Group') {
            targetGroupId = over.id as string;
        } else if (overType === 'Tab') {
            const targetGroup = groups.find(g => g.items.some(t => t.id === over.id));
            if (targetGroup) targetGroupId = targetGroup.id;
        }

        if (targetGroupId && active.id !== targetGroupId) {
            if (shiftPressedRef.current) {
                // Merge Groups
                const sourceGroup = groups.find(g => g.id === active.id);
                const targetGroup = groups.find(g => g.id === targetGroupId);

                if (sourceGroup && targetGroup) {
                    // Merge and deduplicate by URL
                    const seenUrls = new Set<string>();
                    const mergedItems = [...targetGroup.items, ...sourceGroup.items].filter(tab => {
                        if (seenUrls.has(tab.url)) return false;
                        seenUrls.add(tab.url);
                        return true;
                    });

                    const newGroups = groups
                        .filter(g => g.id !== sourceGroup.id)
                        .map(g => g.id === targetGroup.id ? { ...g, items: mergedItems } : g);

                    await updateGroups(newGroups);
                }
            } else if (overType === 'Group') {
                // Standard Reorder (only group-on-group)
                const oldIndex = groups.findIndex(g => g.id === active.id);
                const newIndex = groups.findIndex(g => g.id === targetGroupId);
                const newGroups = arrayMove(groups, oldIndex, newIndex).map((g, idx) => ({ ...g, order: idx }));
                await updateGroups(newGroups);
            }
        }
        return;
    }

    // Tab Reordering / Moving
    if (activeType === 'Tab') {
        const activeTabId = active.id;
        // Find which group the active tab belongs to
        const sourceGroup = groups.find(g => g.items.some((t: TabItem) => t.id === activeTabId));

        if (!sourceGroup) return;

        // Ensure we dropped over something valid
        let targetGroupId: string | null = null;

        if (overType === 'Group') {
            targetGroupId = over.id as string;
        } else if (overType === 'Tab') {
            // Did we drop onto another tab? Find its group
             const targetGroup = groups.find(g => g.items.some((t: TabItem) => t.id === over.id));
             targetGroupId = targetGroup ? targetGroup.id : null;
        }

        if (!targetGroupId) return;

        const targetGroup = groups.find(g => g.id === targetGroupId)!;

        // Case 1: Reordering within same group
        if (sourceGroup.id === targetGroup.id) {
            const oldIndex = sourceGroup.items.findIndex((t: TabItem) => t.id === activeTabId);
            const newIndex = overType === 'Group'
                ? sourceGroup.items.length // Append to end if dropped on group container
                : sourceGroup.items.findIndex((t: TabItem) => t.id === over.id);

            if (oldIndex !== newIndex && newIndex !== -1) {
                const newItems = arrayMove(sourceGroup.items, oldIndex, newIndex);
                const newGroups = groups.map(g =>
                    g.id === sourceGroup.id ? { ...g, items: newItems } : g
                );
                await updateGroups(newGroups);
            }
        }
        // Case 2: Moving to different group
        else {
             const tabToMove = sourceGroup.items.find((t: TabItem) => t.id === activeTabId)!;
             // Remove from source
             const sourceItems = sourceGroup.items.filter((t: TabItem) => t.id !== activeTabId);

             // Add to target
             const targetItems = [...targetGroup.items];
             if (overType === 'Group') {
                 // Check visual order to decide insertion point
                 const pinnedGroups = groups.filter(g => g.pinned).sort((a, b) => a.order - b.order);
                 const unpinnedGroups = groups.filter(g => !g.pinned).sort((a, b) => a.order - b.order);
                 const visualGroups = [...pinnedGroups, ...unpinnedGroups];

                 const sourceIndex = visualGroups.findIndex(g => g.id === sourceGroup.id);
                 const targetIndex = visualGroups.findIndex(g => g.id === targetGroup.id);

                 if (targetIndex > sourceIndex) {
                     // Moving DOWN to a group -> Insert at TOP
                     targetItems.unshift(tabToMove);
                 } else {
                     // Moving UP to a group -> Insert at BOTTOM (default)
                     targetItems.push(tabToMove);
                 }
             } else {
                 const insertIndex = targetItems.findIndex(t => t.id === over.id);
                 if (insertIndex !== -1) {
                     targetItems.splice(insertIndex, 0, tabToMove);
                 } else {
                     targetItems.push(tabToMove);
                 }
             }

             const newGroups = groups.map(g => {
                 if (g.id === sourceGroup.id) return { ...g, items: sourceItems };
                 if (g.id === targetGroup.id) return { ...g, items: targetItems };
                 return g;
             });
             await updateGroups(newGroups);
        }
    }
  };

  return {
    sensors,
    activeId,
    activeItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}
