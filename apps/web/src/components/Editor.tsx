"use client";

import { useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import type { Social } from "@/store/useCVStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Shared UI primitives ─────────────────────────────────────────────────────

const DragHandle = () => (
  <div className="cursor-grab transition-colors px-1 flex-shrink-0" style={{ color: '#334155' }}>
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <path d="M5.5 4.625C6.12 4.625 6.625 4.12 6.625 3.5C6.625 2.88 6.12 2.375 5.5 2.375C4.88 2.375 4.375 2.88 4.375 3.5C4.375 4.12 4.88 4.625 5.5 4.625ZM9.5 4.625C10.12 4.625 10.625 4.12 10.625 3.5C10.625 2.88 10.12 2.375 9.5 2.375C8.88 2.375 8.375 2.88 8.375 3.5C8.375 4.12 8.88 4.625 9.5 4.625ZM10.625 7.5C10.625 8.12 10.12 8.625 9.5 8.625C8.88 8.625 8.375 8.12 8.375 7.5C8.375 6.88 8.88 6.375 9.5 6.375C10.12 6.375 10.625 6.88 10.625 7.5ZM5.5 8.625C6.12 8.625 6.625 8.12 6.625 7.5C6.625 6.88 6.12 6.375 5.5 6.375C4.88 6.375 4.375 6.88 4.375 7.5C4.375 8.12 4.88 4.625 5.5 8.625ZM10.625 11.5C10.625 12.12 10.12 12.625 9.5 12.625C8.88 12.625 8.375 12.12 8.375 11.5C8.375 10.88 8.88 10.375 9.5 10.375C10.12 10.375 10.625 10.88 10.625 11.5ZM5.5 12.625C6.12 12.625 6.625 12.12 6.625 11.5C6.625 10.88 6.12 10.375 5.5 10.375C4.88 10.375 4.375 10.88 4.375 11.5C4.375 12.12 4.88 12.625 5.5 12.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
    </svg>
  </div>
);

// ── Drop zone wrappers (for JobInsightsPanel drag) ────────────────────────────

function DroppableExpCard({ expId, children }: { expId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-exp-${expId}`,
    data: { kind: "experience", expId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? "ring-2 ring-blue-400 ring-offset-1 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

function DroppableSkillGroup({ groupId, children }: { groupId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-skill-${groupId}`,
    data: { kind: "skillGroup", groupId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? "ring-2 ring-green-400 ring-offset-1 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

const RemoveBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="ml-auto flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors"
    style={{ color: '#475569' }}
    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  </button>
);

const SectionCard = ({
  title,
  onAdd,
  addLabel = "Add",
  children,
}: {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>{title}</h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="text-xs font-medium flex items-center gap-1 transition-colors"
          style={{ color: '#8b5cf6' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8b5cf6')}
        >
          <span className="text-base leading-none">+</span> {addLabel}
        </button>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs" style={{ color: '#64748b' }}>{label}</Label>
    {children}
  </div>
);

const Textarea = ({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) => (
  <textarea
    rows={rows}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full rounded-md px-3 py-2 text-sm resize-none focus:outline-none"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: '#cbd5e1',
      fontFamily: 'var(--font-mono)',
    }}
    onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.4)')}
    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
  />
);

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder = "Add tag...",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      onChange([...tags, input.trim()]);
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };
  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 rounded-md min-h-[36px]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded font-medium"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}>
          {tag}
          <button onClick={() => onChange(tags.filter((_, j) => j !== i))} style={{ color: '#a78bfa' }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
        style={{ color: '#cbd5e1' }}
      />
    </div>
  );
}

// ── Sortable row wrapper ──────────────────────────────────────────────────────

type SortableHandleProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners">;

function SortableRow({ id, children }: { id: string; children: (props: SortableHandleProps) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="mb-3 last:mb-0">
      {children({ attributes, listeners })}
    </div>
  );
}

// ── Experience Section ────────────────────────────────────────────────────────

function ExperienceSection() {
  const { cvData, updateExperience, addExperience, removeExperience, reorderExperience } = useCVStore();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = cvData.experience.findIndex((e) => e.id === active.id);
      const newIdx = cvData.experience.findIndex((e) => e.id === over.id);
      reorderExperience(oldIdx, newIdx);
    }
  };

  return (
    <SectionCard title="Expériences" onAdd={addExperience} addLabel="Add experience">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cvData.experience.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {cvData.experience.map((exp) => (
            <SortableRow key={exp.id} id={exp.id}>
              {({ attributes, listeners }) => (
                <DroppableExpCard expId={exp.id}>
                  <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <div {...attributes} {...listeners}><DragHandle /></div>
                      <Input value={exp.role} onChange={(e) => updateExperience(exp.id, { role: e.target.value })} placeholder="Poste" className="font-medium text-sm" />
                      <Input value={exp.company} onChange={(e) => updateExperience(exp.id, { company: e.target.value })} placeholder="Entreprise" className="text-sm" />
                      <RemoveBtn onClick={() => removeExperience(exp.id)} />
                    </div>
                    <div className="flex gap-2">
                      <Input value={exp.period} onChange={(e) => updateExperience(exp.id, { period: e.target.value })} placeholder="Période" className="text-xs" />
                      <Input value={exp.location.city} onChange={(e) => updateExperience(exp.id, { location: { ...exp.location, city: e.target.value } })} placeholder="Ville" className="text-xs" />
                    </div>
                    <Textarea
                      value={exp.description_markdown}
                      onChange={(v) => updateExperience(exp.id, { description_markdown: v })}
                      placeholder="Drop bullets here or type in Markdown…"
                      rows={3}
                    />
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Keywords (Enter pour valider)</Label>
                      <TagInput tags={exp.keywords} onChange={(kw) => updateExperience(exp.id, { keywords: kw })} placeholder="Python, RAG..." />
                    </div>
                  </div>
                </DroppableExpCard>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
    </SectionCard>
  );
}

// ── Education Section ─────────────────────────────────────────────────────────

function EducationSection() {
  const { cvData, updateEducation, addEducation, removeEducation, reorderEducation } = useCVStore();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = cvData.education.findIndex((e) => e.id === active.id);
      const newIdx = cvData.education.findIndex((e) => e.id === over.id);
      reorderEducation(oldIdx, newIdx);
    }
  };

  return (
    <SectionCard title="Formation" onAdd={addEducation} addLabel="Add education">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cvData.education.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {cvData.education.map((edu) => (
            <SortableRow key={edu.id} id={edu.id}>
              {({ attributes, listeners }) => (
                <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners}><DragHandle /></div>
                    <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, { degree: e.target.value })} placeholder="Diplôme" className="font-medium text-sm" />
                    <RemoveBtn onClick={() => removeEducation(edu.id)} />
                  </div>
                  <div className="flex gap-2">
                    <Input value={edu.institution} onChange={(e) => updateEducation(edu.id, { institution: e.target.value })} placeholder="Institution" className="text-sm" />
                    <Input value={edu.period} onChange={(e) => updateEducation(edu.id, { period: e.target.value })} placeholder="Période" className="text-sm w-32" />
                  </div>
                  <Input value={edu.location} onChange={(e) => updateEducation(edu.id, { location: e.target.value })} placeholder="Lieu" className="text-xs" />
                  <Textarea
                    value={edu.description_markdown}
                    onChange={(v) => updateEducation(edu.id, { description_markdown: v })}
                    placeholder="Description..."
                    rows={2}
                  />
                </div>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
    </SectionCard>
  );
}

// ── Skills Section ────────────────────────────────────────────────────────────

function SkillsSection() {
  const { cvData, updateSkillGroup, addSkillGroup, removeSkillGroup } = useCVStore();
  return (
    <SectionCard title="Compétences" onAdd={addSkillGroup} addLabel="Add group">
      <div className="space-y-3">
        {cvData.skills.map((group) => (
          <DroppableSkillGroup key={group.id} groupId={group.id}>
            <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Input
                  value={group.category}
                  onChange={(e) => updateSkillGroup(group.id, { category: e.target.value })}
                  placeholder="Catégorie"
                  className="text-sm font-medium"
                />
                <RemoveBtn onClick={() => removeSkillGroup(group.id)} />
              </div>
              <TagInput
                tags={group.skills}
                onChange={(skills) => updateSkillGroup(group.id, { skills })}
                placeholder="Drop skill tags here or type… (Enter)"
              />
            </div>
          </DroppableSkillGroup>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Projects Section ──────────────────────────────────────────────────────────

function ProjectsSection() {
  const { cvData, updateProject, addProject, removeProject, reorderProjects } = useCVStore();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = cvData.projects.findIndex((p) => p.id === active.id);
      const newIdx = cvData.projects.findIndex((p) => p.id === over.id);
      reorderProjects(oldIdx, newIdx);
    }
  };

  return (
    <SectionCard title="Projets" onAdd={addProject} addLabel="Add project">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cvData.projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {cvData.projects.map((proj) => (
            <SortableRow key={proj.id} id={proj.id}>
              {({ attributes, listeners }) => (
                <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners}><DragHandle /></div>
                    <Input value={proj.name} onChange={(e) => updateProject(proj.id, { name: e.target.value })} placeholder="Nom du projet" className="font-medium text-sm" />
                    <RemoveBtn onClick={() => removeProject(proj.id)} />
                  </div>
                  <Input value={proj.url ?? ""} onChange={(e) => updateProject(proj.id, { url: e.target.value })} placeholder="URL (optionnel)" className="text-xs text-blue-600" />
                  <Textarea
                    value={proj.description_markdown}
                    onChange={(v) => updateProject(proj.id, { description_markdown: v })}
                    placeholder="Description..."
                    rows={2}
                  />
                  <div>
                    <Label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Tech stack</Label>
                    <TagInput tags={proj.tech_stack} onChange={(ts) => updateProject(proj.id, { tech_stack: ts })} placeholder="React, FastAPI..." />
                  </div>
                </div>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
    </SectionCard>
  );
}

// ── Languages Section ─────────────────────────────────────────────────────────

const LEVELS = ["Natif", "C2", "C1", "B2", "B1", "A2", "A1", "Full Professional Proficiency", "Elementary"];

function LanguagesSection() {
  const { cvData, updateLanguage, addLanguage, removeLanguage } = useCVStore();
  return (
    <SectionCard title="Langues" onAdd={addLanguage} addLabel="Add language">
      <div className="space-y-2">
        {cvData.languages.map((lang) => (
          <div key={lang.id} className="flex items-center gap-2">
            <Input value={lang.language} onChange={(e) => updateLanguage(lang.id, { language: e.target.value })} placeholder="Langue" className="text-sm" />
            <select
              value={lang.level}
              onChange={(e) => updateLanguage(lang.id, { level: e.target.value })}
              className="flex-shrink-0 h-9 rounded-md px-2 text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <RemoveBtn onClick={() => removeLanguage(lang.id)} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Hobbies Section ───────────────────────────────────────────────────────────

function HobbiesSection() {
  const { cvData, setHobbies } = useCVStore();
  return (
    <SectionCard title="Centres d'intérêt">
      <TagInput
        tags={cvData.hobbies}
        onChange={setHobbies}
        placeholder="Musique, Sport, Entrepreneuriat... (Enter)"
      />
    </SectionCard>
  );
}

// ── Profile Section ───────────────────────────────────────────────────────────

function ProfileSection() {
  const { cvData, setProfile } = useCVStore();
  const p = cvData.profile;

  return (
    <SectionCard title="Profil">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="Nom complet">
            <Input value={p.full_name} onChange={(e) => setProfile({ full_name: e.target.value })} />
          </FieldRow>
          <FieldRow label="Titre / Poste visé">
            <Input value={p.title} onChange={(e) => setProfile({ title: e.target.value })} />
          </FieldRow>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="Email">
            <Input type="email" value={p.email} onChange={(e) => setProfile({ email: e.target.value })} />
          </FieldRow>
          <FieldRow label="Téléphone">
            <Input value={p.phone} onChange={(e) => setProfile({ phone: e.target.value })} />
          </FieldRow>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="Ville">
            <Input value={p.location.city} onChange={(e) => setProfile({ location: { ...p.location, city: e.target.value } })} />
          </FieldRow>
          <FieldRow label="Pays">
            <Input value={p.location.country} onChange={(e) => setProfile({ location: { ...p.location, country: e.target.value } })} />
          </FieldRow>
        </div>

        {/* Socials */}
        <div className="space-y-1">
          <Label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Réseaux sociaux</Label>
          {p.socials.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={s.type}
                onChange={(e) => {
                  const updated = [...p.socials];
                  updated[i] = { ...s, type: e.target.value as Social["type"] };
                  setProfile({ socials: updated });
                }}
                className="h-8 rounded border px-2 text-xs w-28 flex-shrink-0 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
              >
                <option value="linkedin">LinkedIn</option>
                <option value="github">GitHub</option>
                <option value="website">Portfolio</option>
                <option value="other">Autre</option>
              </select>
              <Input
                value={s.url}
                onChange={(e) => {
                  const updated = [...p.socials];
                  updated[i] = { ...s, url: e.target.value };
                  setProfile({ socials: updated });
                }}
                placeholder="https://..."
                className="text-xs"
              />
              <RemoveBtn onClick={() => setProfile({ socials: p.socials.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <button
            onClick={() => setProfile({ socials: [...p.socials, { type: "other", url: "" }] })}
            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
          >
            + Add social
          </button>
        </div>

        <FieldRow label="Résumé / Accroche (Markdown)">
          <Textarea value={p.text_markdown} onChange={(v) => setProfile({ text_markdown: v })} rows={4} placeholder="Expert en **IA**..." />
        </FieldRow>
      </div>
    </SectionCard>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function Editor() {
  return (
    <ScrollArea className="h-full w-full pr-2">
      <div className="space-y-4 pb-10">
        <ProfileSection />
        <ExperienceSection />
        <EducationSection />
        <SkillsSection />
        <ProjectsSection />
        <LanguagesSection />
        <HobbiesSection />
      </div>
    </ScrollArea>
  );
}
