import React, { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
  type DropAnimation
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import type { Group, TabItem } from '@/types';
import { storage } from '@/lib/storage';
import { useTabs } from '@/hooks/useTabs';
import { GroupCard } from './GroupCard';
import { TabCard } from './TabCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { createPortal } from 'react-dom';

export function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const { saveCurrentWindow } = useTabs();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<Group | TabItem | null>(null);
  const [sessionInput, setSessionInput] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadGroups = useCallback(async () => {
    const data = await storage.get();
    setGroups(data.groups.sort((a, b) => a.order - b.order));
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const updateGroups = async (newGroups: Group[]) => {
    setGroups(newGroups);
    await storage.updateGroups(newGroups);
  };

  const handleSaveSession = async () => {
    const name = sessionInput.trim() || `Session ${new Date().toLocaleDateString()}`;
    const newGroup = await saveCurrentWindow(name);
    setGroups([...groups, newGroup]);
    setSessionInput("");
    await storage.addGroup(newGroup);
  };

  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { data } = active.data.current || {};
    setActiveId(active.id as string);
    setActiveItem(data?.group || data?.tab);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) return;

    // const activeData = active.data.current?.data;
    // const overData = over.data.current?.data;

    // Handling Tab over Group or Tab over Tab (complex nested sortable)
    // Simplified: We mostly handle logic in DragEnd for reordering
    // Real-time visual feedback for moving between containers handles via dnd-kit automatically if setup right
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Group Reordering
    if (activeType === 'Group' && overType === 'Group') {
        if (active.id !== over.id) {
            const oldIndex = groups.findIndex(g => g.id === active.id);
            const newIndex = groups.findIndex(g => g.id === over.id);
            const newGroups = arrayMove(groups, oldIndex, newIndex).map((g, idx) => ({ ...g, order: idx }));
            await updateGroups(newGroups);
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
             const sourceItems = sourceGroup.items.filter((t: TabItem) => t.id !== activeTabId);

             const targetItems = [...targetGroup.items];
             if (overType === 'Group') {
                 targetItems.push(tabToMove);
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

  const removeGroup = async (id: string) => {
    const newGroups = groups.filter(g => g.id !== id);
    await updateGroups(newGroups);
  };

  const removeTab = async (groupId: string, tabId: string) => {
    const newGroups = groups.map(g => {
        if (g.id === groupId) {
            return {
                ...g,
                items: g.items.filter((t: TabItem) => t.id !== tabId)
            };
        }
        return g;
    });
    await updateGroups(newGroups);
  };

  const updateGroupData = async (id: string, data: Partial<Group>) => {
      const newGroups = groups.map(g => g.id === id ? { ...g, ...data } : g);
      setGroups(newGroups); // Optimistic update
      await storage.updateGroups(newGroups);
  };

  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: {
            opacity: '0.5',
          },
        },
      }),
  };

  const pinnedGroups = groups.filter(g => g.pinned);
  const unpinnedGroups = groups.filter(g => !g.pinned);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Puuuush</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
                placeholder="Session Name..."
                value={sessionInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSessionInput(e.target.value)}
                className="w-64"
            />
            <Button onClick={handleSaveSession}>
                <Save className="mr-2 h-4 w-4" />
                Save Session
            </Button>
          </div>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
            {/* Pinned Section */}
            {pinnedGroups.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Pinned</h2>
                    <SortableContext items={pinnedGroups.map(g => g.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {pinnedGroups.map(group => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    onRemoveGroup={removeGroup}
                                    onRemoveTab={removeTab}
                                    onUpdateGroup={updateGroupData}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </section>
            )}

            {/* Main Grid */}
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Collections</h2>
                </div>
                 <SortableContext items={unpinnedGroups.map(g => g.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                         {unpinnedGroups.map(group => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                onRemoveGroup={removeGroup}
                                onRemoveTab={removeTab}
                                onUpdateGroup={updateGroupData}
                            />
                        ))}
                    </div>
                </SortableContext>
            </section>
        </div>

        {createPortal(
            <DragOverlay dropAnimation={dropAnimation}>
                {activeItem && activeId ? (
                   'items' in activeItem ? (
                       <div className="w-[300px]">
                           <GroupCard
                               group={activeItem as Group}
                               onRemoveGroup={() => {}}
                               onRemoveTab={() => {}}
                               onUpdateGroup={() => {}}
                            />
                       </div>
                   ) : (
                       <div className="w-[300px]">
                        <TabCard tab={activeItem as TabItem} onRemove={() => {}} />
                       </div>
                   )
                ) : null}
            </DragOverlay>,
            document.body
        )}
      </DndContext>
    </div>
  );
}
