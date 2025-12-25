import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TabItem } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';

interface TabCardProps {
  tab: TabItem;
  onRemove: (id: string) => void;
}

export function TabCard({ tab, onRemove }: TabCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tab.id, data: { type: 'Tab', tab } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="flex items-center justify-between p-2 hover:bg-accent/50 group cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 overflow-hidden">
          {tab.favIconUrl && (
            <img src={tab.favIconUrl} alt="" className="w-4 h-4 shrink-0" />
          )}
          <span className="truncate text-sm font-medium">{tab.title}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              window.open(tab.url, '_blank');
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation(); // Prevent drag start
              onRemove(tab.id);
            }}
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()} // Prevent drag start
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
