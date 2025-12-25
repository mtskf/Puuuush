import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Group, TabItem } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabCard } from './TabCard';
import { GripVertical, Trash2, ChevronDown, ChevronRight, Pin } from 'lucide-react';
import { cn } from '@/lib/utils'; // Keep this for now

interface GroupCardProps {
  group: Group;
  onRemoveGroup: (id: string) => void;
  onRemoveTab: (groupId: string, tabId: string) => void;
  onUpdateGroup: (id: string, data: Partial<Group>) => void;
}

export function GroupCard({ group, onRemoveGroup, onRemoveTab, onUpdateGroup }: GroupCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(group.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: group.id,
    data: { type: 'Group', group },
    disabled: isEditing // Disable drag while editing name
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTitleSubmit = () => {
    if (newTitle.trim()) {
      onUpdateGroup(group.id, { title: newTitle });
    } else {
      setNewTitle(group.title);
    }
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full flex flex-col">
      <Card className={cn(
        "flex flex-col h-full transition-all",
        group.collapsed ? "h-auto" : "h-full"
      )}>
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 cursor-default">
          <div className="flex items-center gap-2 flex-1 min-w-0">
             {/* Drag Handle */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
               <GripVertical className="h-4 w-4" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onUpdateGroup(group.id, { collapsed: !group.collapsed })}
            >
              {group.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {isEditing ? (
              <Input
                autoFocus
                value={newTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleTitleSubmit()}
                className="h-7 text-sm"
              />
            ) : (
              <h3
                className="font-semibold truncate cursor-text hover:underline"
                onClick={() => setIsEditing(true)}
                title="Click to rename"
              >
                {group.title} <span className="text-muted-foreground text-xs font-normal">({group.items.length})</span>
              </h3>
            )}
          </div>

          <div className="flex items-center gap-1">
             <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", group.pinned ? "text-primary" : "text-muted-foreground")}
                onClick={() => onUpdateGroup(group.id, { pinned: !group.pinned })}
                title={group.pinned ? "Unpin group" : "Pin group"}
             >
                {group.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <Pin className="h-3.5 w-3.5" />}
             </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/70 hover:text-destructive"
              onClick={() => onRemoveGroup(group.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        {!group.collapsed && (
          <CardContent className="p-3 pt-0 flex-1 overflow-y-auto min-h-[100px] flex flex-col gap-2">
            <SortableContext items={group.items.map((t: TabItem) => t.id)} strategy={verticalListSortingStrategy}>
              {group.items.length === 0 ? (
                 <div className="text-center text-muted-foreground text-xs py-4 border-2 border-dashed rounded-md">
                   Drop tabs here
                 </div>
              ) : (
                 group.items.map((tab: TabItem) => (
                   <TabCard
                     key={tab.id}
                     tab={tab}
                     onRemove={(tabId) => onRemoveTab(group.id, tabId)}
                   />
                 ))
              )}
            </SortableContext>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
