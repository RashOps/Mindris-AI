"use client";

import { useState, useEffect } from "react";
import { useCVStore } from "@/store/useCVStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// DND Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Draggable Experience Item ---
function SortableExperience({ exp }: { exp: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: exp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { updateExperience } = useCVStore();

  return (
    <div ref={setNodeRef} style={style} className="mb-4 bg-white rounded-lg border shadow-sm p-4 cursor-default">
      <div className="flex items-center gap-2 mb-2">
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 px-1">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 4.625C6.12132 4.625 6.625 4.12132 6.625 3.5C6.625 2.87868 6.12132 2.375 5.5 2.375C4.87868 2.375 4.375 2.87868 4.375 3.5C4.375 4.12132 4.87868 4.625 5.5 4.625ZM9.5 4.625C10.1213 4.625 10.625 4.12132 10.625 3.5C10.625 2.87868 10.1213 2.375 9.5 2.375C8.87868 2.375 8.375 2.87868 8.375 3.5C8.375 4.12132 8.87868 4.625 9.5 4.625ZM10.625 7.5C10.625 8.12132 10.1213 8.625 9.5 8.625C8.87868 8.625 8.375 8.12132 8.375 7.5C8.375 6.87868 8.87868 6.375 9.5 6.375C10.1213 6.375 10.625 6.87868 10.625 7.5ZM5.5 8.625C6.12132 8.625 6.625 8.12132 6.625 7.5C6.625 6.87868 6.12132 6.375 5.5 6.375C4.87868 6.375 4.375 6.87868 4.375 7.5C4.375 8.12132 4.87868 8.625 5.5 8.625ZM10.625 11.5C10.625 12.1213 10.1213 12.625 9.5 12.625C8.87868 12.625 8.375 12.1213 8.375 11.5C8.375 10.87868 8.87868 10.375 9.5 10.375C10.1213 10.375 10.625 10.87868 10.625 11.5ZM5.5 12.625C6.12132 12.625 6.625 12.1213 6.625 11.5C6.625 10.87868 6.12132 10.375 5.5 10.375C4.87868 10.375 4.375 10.87868 4.375 11.5C4.375 12.1213 4.87868 12.625 5.5 12.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
        </div>
        <Input 
          value={exp.title} 
          onChange={(e) => updateExperience(exp.id, { title: e.target.value })}
          className="font-semibold"
        />
        <Input 
          value={exp.company} 
          onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
        />
      </div>
      
      <div className="flex gap-2 mb-2">
        <Input 
          value={exp.start_date} 
          onChange={(e) => updateExperience(exp.id, { start_date: e.target.value })}
          placeholder="Start Date"
          className="w-1/2"
        />
        <Input 
          value={exp.end_date} 
          onChange={(e) => updateExperience(exp.id, { end_date: e.target.value })}
          placeholder="End Date"
          className="w-1/2"
        />
      </div>

      <Label className="mb-1 block">Description</Label>
      {/* We use standard textarea if Textarea component is missing, but let's assume it's installed */}
      <textarea 
        className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        value={exp.description} 
        onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
      />
    </div>
  );
}

// --- Main Editor Component ---
export function Editor() {
  const { cvData, setCVData, reorderExperience } = useCVStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = cvData.experience.findIndex((i) => i.id === active.id);
      const newIndex = cvData.experience.findIndex((i) => i.id === over.id);
      reorderExperience(oldIndex, newIndex);
    }
  };

  // Prevent SSR hydration mismatch from DndKit
  if (!isMounted) {
    return null;
  }

  return (
    <ScrollArea className="h-full w-full pr-4">
      <div className="space-y-6 pb-10">
        
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={cvData.profile_name} 
                onChange={(e) => setCVData({ profile_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Headline / Title</Label>
              <Input 
                id="title" 
                value={cvData.profile_title} 
                onChange={(e) => setCVData({ profile_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <textarea 
                id="summary"
                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                value={cvData.profile_summary} 
                onChange={(e) => setCVData({ profile_summary: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Experience Section (Draggable) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Experience
              <Button variant="outline" size="sm">Add Item</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={cvData.experience.map(e => e.id)}
                strategy={verticalListSortingStrategy}
              >
                {cvData.experience.map((exp) => (
                  <SortableExperience key={exp.id} exp={exp} />
                ))}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

      </div>
    </ScrollArea>
  );
}
